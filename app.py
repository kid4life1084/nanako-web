import os
import sys
import time
import base64
import tempfile
import re
import subprocess
import wave
from io import BytesIO
from urllib.parse import urlparse

import requests

from flask import (
    Flask,
    render_template,
    request,
    jsonify
)

from pykakasi import kakasi

try:
    import dashscope
    from dashscope.audio.asr import (
        Recognition,
        RecognitionCallback,
        RecognitionResult,
    )
except Exception:
    dashscope = None
    Recognition = None
    RecognitionCallback = object
    RecognitionResult = None

try:
    from dashscope.audio.asr import VocabularyService
except Exception:
    VocabularyService = None



# ============================================================
# NANAKO WEB — SMART MIC + TIGHTER ASR + JAPANESE-ONLY SPEECH
#
# Main speed change:
# - ONE local Qwen request per turn now produces:
#   * Nanako reply
#   * English translation
#   * Japanese analysis
#   * optional adaptive practice question
#
# Removed from the critical path:
# - separate 19s Japanese analyzer call
# - separate contextual-practice Qwen call
# - separate English-translation Qwen call
#
# Still preserved:
# - Whisper
# - learner progress
# - mastery
# - conversation scoring
# - scenario progression
# - corrections
# - adaptive practice
# - romaji
# - Kokoro TTS
# - typed + voice replies both speak
# ============================================================


# ============================================================
# PATHS
# ============================================================

WEB_DIR = os.path.dirname(
    os.path.abspath(__file__)
)

PROJECT_DIR = os.path.dirname(
    WEB_DIR
)

APP_DIR = os.path.join(
    PROJECT_DIR,
    "app"
)

if APP_DIR not in sys.path:
    sys.path.insert(
        0,
        APP_DIR
    )


# ============================================================
# NANAKO MODULES
# ============================================================

import nanako_tutor
import nanako_progress
import nanako_mastery
import nanako_scoring
import nanako_scenarios


# ============================================================
# FLASK
# ============================================================

app = Flask(
    __name__,
    template_folder="templates",
    static_folder="static"
)


# ============================================================
# SPEECH RECOGNITION
#
# Cloud mode:
#   Alibaba Fun-ASR Realtime
#
# Local fallback:
#   faster-whisper "small" on CPU int8
#
# The frontend microphone, pause detection, and barge-in system
# are untouched. Only server-side transcription changes.
# ============================================================

NANAKO_ASR_MODE = str(
    os.getenv("NANAKO_ASR_MODE", "cloud")
).strip().lower() or "cloud"

if NANAKO_ASR_MODE not in {"cloud", "local"}:
    NANAKO_ASR_MODE = "cloud"

NANAKO_ASR_MODEL = str(
    os.getenv("NANAKO_ASR_MODEL", "fun-asr-realtime")
).strip() or "fun-asr-realtime"

NANAKO_ASR_FALLBACK = str(
    os.getenv("NANAKO_ASR_FALLBACK", "1")
).strip().lower() not in {
    "0", "false", "off", "no"
}

# ------------------------------------------------------------
# Nanako / Leo proper-name recognition
#
# We keep ASR language detection on AUTO because Nanako supports:
# - Japanese conversation
# - English Quick Japanese Help
#
# Instead of forcing Japanese, use a reusable custom hotword list.
# Alibaba recommends weight 4 as a normal starting point.
#
# If Singapore hotwords are unavailable for the current workspace
# (for example, a sub-workspace), the app continues normally and
# the narrow transcript repair below still protects Nanako's name.
# ------------------------------------------------------------

NANAKO_ASR_HOTWORDS = str(
    os.getenv("NANAKO_ASR_HOTWORDS", "1")
).strip().lower() not in {
    "0", "false", "off", "no"
}

NANAKO_ASR_VOCABULARY_ID = str(
    os.getenv("NANAKO_ASR_VOCABULARY_ID", "")
).strip()

NANAKO_ASR_HOTWORD_PREFIX = "nanakovo"

NANAKO_ASR_HOTWORD_WEIGHT = 4

NANAKO_ASR_HOTWORD_LIST = [
    {"text": "ナナコ", "weight": NANAKO_ASR_HOTWORD_WEIGHT},
    {"text": "ななこ", "weight": NANAKO_ASR_HOTWORD_WEIGHT},
    {"text": "Nanako", "weight": NANAKO_ASR_HOTWORD_WEIGHT},
    {"text": "レオ", "weight": NANAKO_ASR_HOTWORD_WEIGHT},
    {"text": "Leo", "weight": NANAKO_ASR_HOTWORD_WEIGHT},
]

_nanako_asr_vocabulary_checked = False
_nanako_asr_vocabulary_id = None

# Used only for a rough console estimate.
ASR_LIST_PRICE_PER_SECOND_USD = 0.000090

WHISPER_MODEL_NAME = "small"
WHISPER_DEVICE = "cpu"
WHISPER_COMPUTE_TYPE = "int8"
WHISPER_LANGUAGE = "ja"


# ============================================================
# SPEECH SYNTHESIS
#
# Cloud mode:
#   Alibaba Qwen3-TTS-Flash + Ono Anna
#
# Local fallback:
#   Kokoro jf_alpha
#
# The frontend still receives one complete WAV reply exactly as before,
# so microphone/barge-in/playback behavior is not changed in this stage.
# ============================================================

NANAKO_TTS_MODE = str(
    os.getenv("NANAKO_TTS_MODE", "cloud")
).strip().lower() or "cloud"

if NANAKO_TTS_MODE not in {"cloud", "local"}:
    NANAKO_TTS_MODE = "cloud"

NANAKO_TTS_MODEL = str(
    os.getenv("NANAKO_TTS_MODEL", "qwen3-tts-flash")
).strip() or "qwen3-tts-flash"

NANAKO_TTS_VOICE = str(
    os.getenv("NANAKO_TTS_VOICE", "Ono Anna")
).strip() or "Ono Anna"

NANAKO_TTS_FALLBACK = str(
    os.getenv("NANAKO_TTS_FALLBACK", "1")
).strip().lower() not in {
    "0", "false", "off", "no"
}

# Current international list price used only for a rough console estimate.
# qwen3-tts-flash is billed by input text characters.
TTS_LIST_PRICE_PER_10K_CHARS_USD = 0.10

TTS_HTTP_URL = (
    "https://dashscope-intl.aliyuncs.com/api/v1/"
    "services/aigc/multimodal-generation/generation"
)

KOKORO_LANGUAGE = "j"
KOKORO_VOICE = "jf_alpha"
KOKORO_SPEED = 1.0
KOKORO_SAMPLE_RATE = 24000


# ============================================================
# GLOBAL MODELS
# ============================================================

whisper_model = None

kokoro_pipeline = None

romaji_converter = kakasi()


# ============================================================
# DATABASES
# ============================================================

nanako_progress.init_db()

nanako_mastery.init_db()


# ============================================================
# NANAKO PERSONALITY
# ============================================================

personality = nanako_tutor.load_personality()

SYSTEM_PROMPT = nanako_tutor.build_system_prompt(
    personality
)

SYSTEM_PROMPT += r"""

ABSOLUTE SPOKEN-LANGUAGE RULE:
- Nanako's spoken reply field r MUST be Japanese.
- This rule applies whether the learner speaks Japanese or English.
- English may appear only in the separate English translation field e,
  never as Nanako's spoken conversational reply.
- For English Quick Japanese Help, understand the English request and
  answer naturally in Japanese.
- If speech recognition appears garbled, nonsensical, or uncertain,
  ask the learner to repeat themselves IN JAPANESE rather than replying
  in English or treating strange ASR fragments as intentional content.
- Never switch the spoken conversation to English unless the product
  design is explicitly changed in code.
""".strip()

SYSTEM_PROMPT += r"""

CONVERSATIONAL CONTEXT RULES:
- Pay close attention to facts the learner explicitly stated in their most recent turn.
- Never immediately ask for information the learner just told you.
- Example: if the learner says they are working now, do not then ask
  "What are you doing now?" Acknowledge the work and ask a related,
  non-redundant follow-up such as whether they are busy or what kind of
  work they are doing.
- Before asking a question, check the learner's latest message and recent
  conversation history to make sure the question has not already been
  answered.
- If the latest speech transcript seems semantically inconsistent,
  badly garbled, or too uncertain to support a sensible reply, ask the
  learner to repeat it in Japanese instead of inventing meaning.
""".strip()


# ============================================================
# CONVERSATION STATE
# ============================================================

conversation_history = []

conversation_score = 0

last_correction = None

current_scenario = nanako_scenarios.DEFAULT_SCENARIO


opening_message = (
    "こんにちは！ななこです 😊 "
    "今日も気楽に話そう。"
)


conversation_history.append(
    {
        "role": "assistant",
        "content": opening_message
    }
)


# ============================================================
# LOAD WHISPER
# ============================================================

def load_whisper():

    if str(os.getenv("NANAKO_ASR_FALLBACK", "0")).strip().lower() in {
        "0", "false", "off", "no"
    }:
        raise RuntimeError(
            "Local Whisper is disabled on Function Compute."
        )



    global whisper_model

    if whisper_model is not None:
        return

    print()
    print(
        "[Whisper JA] Loading:",
        WHISPER_MODEL_NAME
    )

    start = time.monotonic()

    whisper_model = WhisperModel(
        WHISPER_MODEL_NAME,
        device=WHISPER_DEVICE,
        compute_type=WHISPER_COMPUTE_TYPE
    )

    elapsed = time.monotonic() - start

    print(
        f"[Whisper JA] Ready: {elapsed:.2f}s"
    )


# ============================================================
# LOAD KOKORO
# ============================================================

def load_kokoro():

    if str(os.getenv("NANAKO_TTS_FALLBACK", "0")).strip().lower() in {
        "0", "false", "off", "no"
    }:
        raise RuntimeError(
            "Local Kokoro is disabled on Function Compute."
        )



    global kokoro_pipeline

    if kokoro_pipeline is not None:
        return

    print()
    print("[Kokoro JA] Loading...")

    start = time.monotonic()

    # Local benchmark on this machine showed 16 CPU threads
    # was the fastest Kokoro setting.
    torch.set_num_threads(16)

    kokoro_pipeline = KPipeline(
        lang_code=KOKORO_LANGUAGE
    )

    # Pre-warm the exact Nanako voice during Flask startup.
    # This pays model/voice initialization cost before the first
    # real conversation turn instead of during the user's reply.
    print(
        f"[Kokoro JA] Warming voice: {KOKORO_VOICE}..."
    )

    try:

        warmup_generator = kokoro_pipeline(
            "こんにちは。",
            voice=KOKORO_VOICE,
            speed=KOKORO_SPEED,
            split_pattern=r"\n+"
        )

        for _ in warmup_generator:
            pass

    except Exception as error:

        # Warm-up failure should never prevent Nanako from starting.
        # generate_tts_wav() can still try normally later.
        print(
            "[Kokoro warmup warning]",
            error
        )

    elapsed = time.monotonic() - start

    print(
        f"[Kokoro JA] Ready + warmed: {elapsed:.2f}s"
    )


# ============================================================
# AUDIO TO NUMPY
# ============================================================

def audio_to_numpy(audio):

    if audio is None:
        return None

    if hasattr(audio, "detach"):

        audio = (
            audio
            .detach()
            .cpu()
            .numpy()
        )

    audio = np.asarray(
        audio,
        dtype=np.float32
    )

    return audio.squeeze()


# ============================================================
# LOCAL WHISPER TRANSCRIPTION
# ============================================================

def transcribe_audio_local(path):

    load_whisper()

    print()
    print("[ASR provider] Local Whisper | small")

    start = time.monotonic()

    segments, info = whisper_model.transcribe(
        path,
        language=WHISPER_LANGUAGE,
        task="transcribe",
        beam_size=1,
        vad_filter=False,
        condition_on_previous_text=False,
        temperature=0.0
    )

    parts = []

    for segment in segments:

        text = (segment.text or "").strip()

        if text:
            parts.append(text)

    transcript = " ".join(parts).strip()

    elapsed = time.monotonic() - start

    print(
        f"[Web voice] Whisper: {elapsed:.2f}s"
    )

    print(
        "[Transcript]",
        transcript
    )

    return transcript


# ============================================================
# ALIBABA FUN-ASR REALTIME
# ============================================================

def configure_dashscope_asr():

    if dashscope is None:
        raise RuntimeError(
            "DashScope SDK is not installed. "
            "Run: py -m pip install -U dashscope"
        )

    api_key = os.getenv(
        "DASHSCOPE_API_KEY"
    )

    base_url = os.getenv(
        "ALIBABA_BASE_URL"
    )

    if not api_key:
        raise RuntimeError(
            "DASHSCOPE_API_KEY is missing."
        )

    if not base_url:
        raise RuntimeError(
            "ALIBABA_BASE_URL is missing."
        )

    parsed = urlparse(
        base_url
    )

    if not parsed.hostname:
        raise RuntimeError(
            "Could not derive Alibaba workspace host "
            "from ALIBABA_BASE_URL."
        )

    dashscope.api_key = api_key

    # Use the same Singapore/workspace host already configured
    # for Nanako's Qwen OpenAI-compatible endpoint.
    #
    # WebSocket = real-time ASR
    # HTTP      = custom vocabulary management
    dashscope.base_websocket_api_url = (
        f"wss://{parsed.hostname}/api-ws/v1/inference"
    )

    dashscope.base_http_api_url = (
        f"https://{parsed.hostname}/api/v1"
    )



def ensure_nanako_asr_hotwords():
    """
    Reuse or create one small precompiled hotword list for Nanako/Leo.

    No hotword list is created repeatedly:
    - explicit NANAKO_ASR_VOCABULARY_ID wins
    - otherwise we search for prefix "nanakovo"
    - reuse/update an existing matching list
    - create only when none exists

    If the current Singapore workspace does not support custom hotwords,
    return None and continue using normal Fun-ASR.
    """

    global _nanako_asr_vocabulary_checked
    global _nanako_asr_vocabulary_id

    if not NANAKO_ASR_HOTWORDS:
        return None

    if NANAKO_ASR_VOCABULARY_ID:
        if not _nanako_asr_vocabulary_checked:
            print(
                "[ASR hotwords] Using configured vocabulary:",
                NANAKO_ASR_VOCABULARY_ID
            )

        _nanako_asr_vocabulary_checked = True
        _nanako_asr_vocabulary_id = (
            NANAKO_ASR_VOCABULARY_ID
        )

        return _nanako_asr_vocabulary_id

    if _nanako_asr_vocabulary_checked:
        return _nanako_asr_vocabulary_id

    _nanako_asr_vocabulary_checked = True

    if VocabularyService is None:
        print(
            "[ASR hotwords] VocabularyService unavailable; "
            "continuing without cloud hotwords."
        )
        return None

    try:
        configure_dashscope_asr()

        service = VocabularyService()

        existing = service.list_vocabularies(
            prefix=NANAKO_ASR_HOTWORD_PREFIX,
            page_index=0,
            page_size=10
        ) or []

        desired_texts = {
            item["text"]
            for item in NANAKO_ASR_HOTWORD_LIST
        }

        for item in existing:
            vocabulary_id = str(
                item.get(
                    "vocabulary_id",
                    ""
                )
                or ""
            ).strip()

            if not vocabulary_id:
                continue

            try:
                details = service.query_vocabulary(
                    vocabulary_id
                ) or {}
            except Exception:
                continue

            if (
                str(
                    details.get(
                        "target_model",
                        ""
                    )
                    or ""
                ).strip()
                != NANAKO_ASR_MODEL
            ):
                continue

            status = str(
                details.get(
                    "status",
                    item.get(
                        "status",
                        ""
                    )
                )
                or ""
            ).upper()

            if status != "OK":
                continue

            current_texts = {
                str(
                    entry.get(
                        "text",
                        ""
                    )
                    or ""
                ).strip()
                for entry in (
                    details.get(
                        "vocabulary",
                        []
                    )
                    or []
                )
                if isinstance(
                    entry,
                    dict
                )
            }

            if not desired_texts.issubset(
                current_texts
            ):
                service.update_vocabulary(
                    vocabulary_id,
                    NANAKO_ASR_HOTWORD_LIST
                )

                print(
                    "[ASR hotwords] Updated existing Nanako vocabulary."
                )

            _nanako_asr_vocabulary_id = (
                vocabulary_id
            )

            print(
                "[ASR hotwords] Active:",
                vocabulary_id,
                "| ナナコ / Nanako / レオ / Leo"
            )

            return _nanako_asr_vocabulary_id

        # No usable matching list exists. Create exactly one.
        vocabulary_id = service.create_vocabulary(
            target_model=NANAKO_ASR_MODEL,
            prefix=NANAKO_ASR_HOTWORD_PREFIX,
            vocabulary=NANAKO_ASR_HOTWORD_LIST
        )

        vocabulary_id = str(
            vocabulary_id
            or ""
        ).strip()

        if not vocabulary_id:
            raise RuntimeError(
                "Alibaba returned an empty vocabulary ID."
            )

        # Deployment is normally quick. Give it a brief chance to
        # become ready without making every ASR request wait.
        ready = False

        for _ in range(8):
            details = service.query_vocabulary(
                vocabulary_id
            ) or {}

            if str(
                details.get(
                    "status",
                    ""
                )
                or ""
            ).upper() == "OK":
                ready = True
                break

            time.sleep(0.25)

        if not ready:
            print(
                "[ASR hotwords] Vocabulary created but is not ready yet; "
                "normal ASR will be used for this server run."
            )
            return None

        _nanako_asr_vocabulary_id = (
            vocabulary_id
        )

        print(
            "[ASR hotwords] Created and active:",
            vocabulary_id,
            "| ナナコ / Nanako / レオ / Leo"
        )

        return _nanako_asr_vocabulary_id

    except Exception as error:
        # Singapore sub-workspaces currently do not support custom
        # vocabularies. This is deliberately non-fatal.
        print(
            "[ASR hotwords warning]",
            error
        )
        print(
            "[ASR hotwords] Continuing with normal Fun-ASR "
            "+ narrow Nanako-name repair."
        )

        _nanako_asr_vocabulary_id = None

        return None


def audio_file_to_cloud_wav(path):

    # Alibaba Function Compute production path.
    # Convert browser audio to 16 kHz mono WAV with FFmpeg.

    command = [
        "ffmpeg",
        "-hide_banner",
        "-loglevel", "error",
        "-i", path,
        "-vn",
        "-ac", "1",
        "-ar", "16000",
        "-c:a", "pcm_s16le",
        "-f", "wav",
        "pipe:1",
    ]

    process = subprocess.run(
        command,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=False,
    )

    if process.returncode != 0 or not process.stdout:

        message = (
            process.stderr.decode(
                "utf-8",
                errors="replace"
            ).strip()
        )

        raise RuntimeError(
            "FFmpeg could not decode the microphone recording"
            + (f": {message}" if message else ".")
        )

    wav_bytes = process.stdout
    duration = 0.0

    try:
        with wave.open(
            BytesIO(wav_bytes),
            "rb"
        ) as wav_file:

            frame_rate = (
                wav_file.getframerate()
                or 16000
            )

            duration = (
                wav_file.getnframes()
                / float(frame_rate)
            )

    except Exception:
        duration = 0.0

    return (
        wav_bytes,
        duration
    )


class NanakoASRCallback(
    RecognitionCallback
):

    def __init__(self):

        super().__init__()

        self.final_parts = []
        self.latest_text = ""
        self.error_message = ""

    def on_open(self):
        pass

    def on_close(self):
        pass

    def on_complete(self):
        pass

    def on_error(
        self,
        result
    ):

        self.error_message = str(
            getattr(
                result,
                "message",
                result
            )
        )

    def on_event(
        self,
        result
    ):

        try:

            sentence = (
                result.get_sentence()
                or {}
            )

        except Exception:

            return

        text = str(
            sentence.get(
                "text",
                ""
            )
            or ""
        ).strip()

        if text:
            self.latest_text = text

        try:

            is_end = (
                RecognitionResult
                .is_sentence_end(
                    sentence
                )
            )

        except Exception:

            is_end = bool(
                sentence.get(
                    "sentence_end",
                    False
                )
            )

        if (
            is_end
            and text
        ):

            if (
                not self.final_parts
                or self.final_parts[-1] != text
            ):

                self.final_parts.append(
                    text
                )


def clean_cloud_transcript(text):

    text = str(
        text
        or ""
    ).strip()

    # ========================================================
    # A. REMOVE OBSERVED LEADING ASR HESITATION ARTIFACTS
    # ========================================================

    text = re.sub(
        r"^(?:嗯[\s。！？!?、,.]*)+",
        "",
        text
    ).strip()

    # ========================================================
    # B. REPAIR KNOWN NANAKO NAME CORRUPTIONS
    #
    # IMPORTANT:
    # Do NOT grammar-correct the learner here.
    # This function only fixes very narrow ASR artifacts.
    # ========================================================

    original = text

    patterns = [
        # Observed English-like corruption:
        # "Two one none ago. 今はお元気ですか？"
        r"^(?:hey[\s,，]*)?two\s+one\s+none\s+ago(?=\s*[\.,!?。！？、，]|$)",

        # Observed Chinese corruption:
        # "那那个。私はレオです。"
        r"^(?:hey[\s,，]*)?那\s*那个(?=\s*[\.,!?。！？、，]|$)",

        # Observed Japanese phonetic corruption.
        r"^(?:hey[\s,，]*)?(?:ななこう|ナナこう|ナナコウ|ナンナコ|なんなこ)(?=\s*[\.,!?。！？、，]|$)",
    ]

    for pattern in patterns:

        match = re.search(
            pattern,
            text,
            flags=re.IGNORECASE
        )

        if not match:
            continue

        remainder = (
            text[
                match.end():
            ]
            .lstrip(
                " \t\r\n.,!?。！？、，"
            )
        )

        remainder_has_japanese = bool(
            re.search(
                r"[\u3040-\u30ff\u3400-\u9fff]",
                remainder
            )
        )

        repaired_name = (
            "ナナコ"
            if remainder_has_japanese
            else "Nanako"
        )

        if remainder:

            separator = (
                "、"
                if remainder_has_japanese
                else ", "
            )

            text = (
                repaired_name
                + separator
                + remainder
            )

        else:
            text = repaired_name

        break

    if text != original:

        print(
            "[ASR name repair]",
            repr(original),
            "->",
            repr(text)
        )

    return text


# ============================================================
# ASR LANGUAGE-CORRUPTION DETECTION
# ============================================================

def looks_like_asr_language_corruption(text):
    """
    Detect obvious cases where AUTO language detection appears to have
    interpreted Japanese learner speech as Chinese.

    This is intentionally conservative. Ordinary Japanese kanji must NOT
    trigger the retry. We only react to strong simplified-Chinese markers
    and exact corruptions observed during Nanako testing.
    """

    text = str(
        text
        or ""
    ).strip()

    if not text:
        return False

    # Exact/strong corruptions already observed in real Nanako tests.
    observed_bad_patterns = [
        r"啊",
        r"一沓沓",
        r"那\s*那个",
    ]

    if any(
        re.search(
            pattern,
            text
        )
        for pattern in observed_bad_patterns
    ):
        return True

    # Simplified-Chinese characters/particles that are not normal modern
    # Japanese orthography. Avoid characters such as 会 or 誰 that are
    # legitimate Japanese kanji.
    chinese_only_markers = set(
        "嗯吗嘛啦哦喔啥这们让给没还说对个么"
    )

    suspicious_count = sum(
        1
        for char in text
        if char in chinese_only_markers
    )

    kana_count = len(
        re.findall(
            r"[\u3040-\u30ff]",
            text
        )
    )

    if suspicious_count >= 2:
        return True

    if (
        suspicious_count >= 1
        and kana_count <= 4
    ):
        return True

    return False


def transcribe_audio_cloud(
    path,
    language_hint="ja"
):

    configure_dashscope_asr()

    print()

    print(
        "[ASR provider] Alibaba Cloud |",
        NANAKO_ASR_MODEL,
        "| language: ja (voice input Japanese-only)"
    )

    wav_bytes, duration = (
        audio_file_to_cloud_wav(
            path
        )
    )

    callback = (
        NanakoASRCallback()
    )

    vocabulary_id = (
        ensure_nanako_asr_hotwords()
    )

    recognition_kwargs = {
        "model": NANAKO_ASR_MODEL,
        "format": "wav",
        "sample_rate": 16000,
        "semantic_punctuation_enabled": False,
        "callback": callback,
    }

    # Nanako microphone mode is intentionally Japanese-only.
    # Typed chat remains bilingual, but voice recognition is always locked
    # to Japanese so learner speech such as "つかれた" is not misread as
    # English words such as "Scarlet" or "Skeleton".
    recognition_kwargs[
        "language_hints"
    ] = [
        "ja"
    ]

    if vocabulary_id:
        recognition_kwargs[
            "vocabulary_id"
        ] = vocabulary_id

    recognition = Recognition(
        **recognition_kwargs
    )

    start = time.monotonic()

    recognition.start()

    # Same short-frame strategy that passed our benchmark.
    chunk_size = 3200

    for offset in range(
        0,
        len(wav_bytes),
        chunk_size
    ):

        recognition.send_audio_frame(
            wav_bytes[
                offset:
                offset + chunk_size
            ]
        )

    recognition.stop()

    elapsed = (
        time.monotonic()
        - start
    )

    if callback.error_message:
        raise RuntimeError(
            callback.error_message
        )

    transcript = " ".join(
        callback.final_parts
    ).strip()

    if not transcript:
        transcript = (
            callback.latest_text
            .strip()
        )

    transcript = (
        clean_cloud_transcript(
            transcript
        )
    )

    estimated_cost = (
        duration
        * ASR_LIST_PRICE_PER_SECOND_USD
    )

    print(
        f"[Web voice] Alibaba ASR: "
        f"{elapsed:.2f}s"
    )

    print(
        f"[ASR audio] {duration:.2f}s | "
        f"estimated list-price cost "
        f"${estimated_cost:.6f}"
    )

    print(
        "[Transcript]",
        transcript
    )

    return transcript


def transcribe_audio(path):

    if NANAKO_ASR_MODE == "local":

        return transcribe_audio_local(
            path
        )

    try:

        transcript = (
            transcribe_audio_cloud(
                path
            )
        )

        if transcript:
            return transcript

        # IMPORTANT:
        # A successful cloud-ASR call that returns no words is not the
        # same thing as a technical ASR failure. It usually means the
        # recording contained no meaningful speech (cough, throat clear,
        # pet noise, room noise, etc.).
        #
        # Do NOT wake up local Whisper for this case. Quietly return an
        # empty transcript so /api/voice can tell the browser to resume
        # listening without spending more time or compute.
        print()
        print(
            "[ASR no-speech] Cloud ASR completed successfully "
            "but found no meaningful speech."
        )

        return ""

    except Exception as error:

        print()
        print(
            "[ASR cloud warning]",
            error
        )

        if not NANAKO_ASR_FALLBACK:

            raise

        print(
            "[ASR fallback] "
            "Using local Whisper small."
        )

        return transcribe_audio_local(
            path
        )


# ============================================================
# JAPANESE → READABLE ROMAJI
# ============================================================

def generate_romaji(text):

    if not text:
        return ""

    try:

        converted = romaji_converter.convert(text)

        output = []

        punctuation = {
            "。": ".",
            "、": ",",
            "？": "?",
            "！": "!",
            "〜": "~",
            "～": "~",
            "・": " ",
            "「": "",
            "」": "",
            "『": "",
            "』": "",
            "（": "(",
            "）": ")",
            "(": "(",
            ")": ")"
        }

        for item in converted:

            original = (
                item.get("orig", "")
                or ""
            )

            romaji = (
                item.get("hepburn", "")
                or original
            )

            if original in punctuation:

                symbol = punctuation[original]

                if output:
                    output[-1] = output[-1].rstrip()

                if symbol:
                    output.append(symbol)

                    if symbol != "(":
                        output.append(" ")

                continue

            if original.isspace():
                output.append(" ")
                continue

            cleaned = romaji.strip()

            if not cleaned:
                continue

            output.append(cleaned)
            output.append(" ")

        result = "".join(output)
        result = " ".join(result.split())

        result = (
            result
            .replace(" ,", ",")
            .replace(" .", ".")
            .replace(" ?", "?")
            .replace(" !", "!")
            .replace("( ", "(")
            .replace(" )", ")")
        )

        result = (
            result
            .replace(",", ", ")
            .replace(".", ". ")
            .replace("?", "? ")
            .replace("!", "! ")
        )

        result = " ".join(result.split())

        return result.strip()

    except Exception as error:

        print(
            "[Romaji error]",
            error
        )

        return ""


# ============================================================
# LOCAL KOKORO TTS
# ============================================================

def generate_tts_wav_local(text):

    load_kokoro()

    if not text:
        return None

    print()
    print("[TTS provider] Local Kokoro | jf_alpha")
    print("[Web TTS] Generating...")

    start = time.monotonic()

    audio_chunks = []

    generator = kokoro_pipeline(
        text,
        voice=KOKORO_VOICE,
        speed=KOKORO_SPEED,
        split_pattern=r"\n+"
    )

    for result in generator:

        audio = None

        if hasattr(result, "audio"):
            audio = result.audio

        elif isinstance(result, (tuple, list)):

            if len(result) >= 3:
                audio = result[2]

        audio = audio_to_numpy(audio)

        if audio is None:
            continue

        if audio.size == 0:
            continue

        audio_chunks.append(audio)

    if not audio_chunks:
        return None

    combined = np.concatenate(audio_chunks)

    buffer = BytesIO()

    sf.write(
        buffer,
        combined,
        KOKORO_SAMPLE_RATE,
        format="WAV",
        subtype="PCM_16"
    )

    buffer.seek(0)

    wav_bytes = buffer.read()

    elapsed = time.monotonic() - start

    print(
        f"[Web TTS] Kokoro ready: {elapsed:.2f}s"
    )

    return wav_bytes


# ============================================================
# ALIBABA QWEN3-TTS-FLASH
# ============================================================

def generate_tts_wav_cloud(text):

    if not text:
        return None

    api_key = os.getenv(
        "DASHSCOPE_API_KEY"
    )

    if not api_key:
        raise RuntimeError(
            "DASHSCOPE_API_KEY is missing."
        )

    print()
    print(
        f"[TTS provider] Alibaba Cloud | "
        f"{NANAKO_TTS_MODEL} | {NANAKO_TTS_VOICE}"
    )
    print("[Web TTS] Generating...")

    payload = {
        "model": NANAKO_TTS_MODEL,
        "input": {
            "text": str(text),
            "voice": NANAKO_TTS_VOICE,
            "language_type": "Japanese"
        }
    }

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }

    start = time.monotonic()

    response = requests.post(
        TTS_HTTP_URL,
        headers=headers,
        json=payload,
        timeout=90
    )

    api_elapsed = (
        time.monotonic()
        - start
    )

    if not response.ok:

        raise RuntimeError(
            f"Alibaba TTS HTTP "
            f"{response.status_code}: "
            f"{response.text[:1000]}"
        )

    data = response.json()

    if data.get(
        "status_code",
        response.status_code
    ) != 200:

        raise RuntimeError(
            "Alibaba TTS API error: "
            f"{data.get('code', '')} "
            f"{data.get('message', '')}"
        )

    output = (
        data.get("output")
        or {}
    )

    audio = (
        output.get("audio")
        or {}
    )

    audio_url = audio.get("url")

    if not audio_url:

        raise RuntimeError(
            "Alibaba TTS returned no audio URL."
        )

    usage = (
        data.get("usage")
        or {}
    )

    characters = usage.get(
        "characters"
    )

    if characters is None:
        characters = len(
            str(text)
        )

    audio_response = requests.get(
        audio_url,
        timeout=90
    )

    if not audio_response.ok:

        raise RuntimeError(
            "Alibaba TTS audio download failed: "
            f"HTTP {audio_response.status_code}"
        )

    wav_bytes = audio_response.content

    elapsed = (
        time.monotonic()
        - start
    )

    estimated_cost = (
        float(characters)
        / 10000.0
        * TTS_LIST_PRICE_PER_10K_CHARS_USD
    )

    finish_reason = output.get(
        "finish_reason"
    )

    print(
        f"[TTS usage] "
        f"characters={characters} | "
        f"estimated list-price cost "
        f"${estimated_cost:.6f}"
    )

    if finish_reason:

        print(
            f"[TTS finish_reason] "
            f"{finish_reason}"
        )

    print(
        f"[Web TTS] Alibaba API: "
        f"{api_elapsed:.2f}s"
    )

    print(
        f"[Web TTS] Ono Anna ready: "
        f"{elapsed:.2f}s"
    )

    return wav_bytes


# ============================================================
# TTS PROVIDER DISPATCH + KOKORO FALLBACK
# ============================================================

def generate_tts_wav(text):

    if NANAKO_TTS_MODE == "local":

        return generate_tts_wav_local(
            text
        )

    try:

        audio = generate_tts_wav_cloud(
            text
        )

        if audio:
            return audio

        raise RuntimeError(
            "Alibaba TTS returned empty audio."
        )

    except Exception as error:

        print()
        print(
            "[TTS cloud warning]",
            error
        )

        if not NANAKO_TTS_FALLBACK:

            raise

        print(
            "[TTS fallback] "
            "Using local Kokoro jf_alpha."
        )

        return generate_tts_wav_local(
            text
        )


# ============================================================
# JAPANESE RESPONSE LEVEL
# ============================================================

VALID_JAPANESE_LEVELS = {
    "auto", "n5", "n4", "n3", "n2", "n1"
}

def normalize_japanese_level(value):

    level = str(value or "auto").strip().lower()

    if level not in VALID_JAPANESE_LEVELS:
        return "auto"

    return level


# ============================================================
# JAPANESE-ONLY SPOKEN REPLY SAFETY
# ============================================================

def contains_japanese_script(text):

    return bool(
        re.search(
            r"[\u3040-\u30ff\u3400-\u9fff]",
            str(
                text
                or ""
            )
        )
    )


def enforce_japanese_spoken_reply(
    reply,
    english=""
):
    """
    Last-resort TTS guard.

    The prompt already requires Japanese. This safeguard prevents an
    accidental entirely-English / English-dominant generation from
    being spoken aloud.

    It does NOT make another Qwen call, so there is no extra model cost.
    """

    reply = str(
        reply
        or ""
    ).strip()

    english = str(
        english
        or ""
    ).strip()

    if not reply:
        return (
            "ごめん、うまく聞き取れなかった。"
            "もう一度言ってくれる？",
            "Sorry, I couldn't understand that well. "
            "Could you say it again?"
        )

    japanese_chars = len(
        re.findall(
            r"[\u3040-\u30ff\u3400-\u9fff]",
            reply
        )
    )

    latin_letters = len(
        re.findall(
            r"[A-Za-z]",
            reply
        )
    )

    # Completely non-Japanese replies must never reach TTS.
    if japanese_chars == 0:
        print(
            "[Japanese-only guard] Blocked non-Japanese spoken reply:",
            repr(
                reply[:160]
            )
        )

        return (
            "ごめん、うまく聞き取れなかった。"
            "もう一度言ってくれる？",
            "Sorry, I couldn't understand that well. "
            "Could you say it again?"
        )

    # If Qwen accidentally prepends a substantial English sentence
    # before a valid Japanese answer, preserve the Japanese tail.
    if (
        latin_letters >= 24
        and latin_letters >
        japanese_chars * 1.5
    ):
        first_japanese = re.search(
            r"[\u3040-\u30ff\u3400-\u9fff]",
            reply
        )

        if first_japanese:
            japanese_tail = (
                reply[
                    first_japanese.start():
                ]
                .strip()
            )

            tail_japanese_chars = len(
                re.findall(
                    r"[\u3040-\u30ff\u3400-\u9fff]",
                    japanese_tail
                )
            )

            if tail_japanese_chars >= 4:
                print(
                    "[Japanese-only guard] Removed accidental "
                    "English lead-in before TTS."
                )

                return (
                    japanese_tail,
                    english
                )

        print(
            "[Japanese-only guard] Blocked English-dominant spoken reply:",
            repr(
                reply[:160]
            )
        )

        return (
            "ごめん、ちょっと言い方が変になった。"
            "もう一度日本語で答えるね。",
            "Sorry, my wording came out strangely. "
            "I'll answer again in Japanese."
        )

    return (
        reply,
        english
    )


# ============================================================
# PROCESS NANAKO MESSAGE — ONE QWEN CALL
# ============================================================

def process_nanako_message(user_message, response_level="auto"):

    global conversation_score
    global last_correction

    response_level = normalize_japanese_level(
        response_level
    )

    # ========================================================
    # 1. EXISTING LEARNER STATE
    #
    # Choose a target from PREVIOUS mastery. The unified model
    # can decide not to use it if the current turn contains an
    # important correction or is not normal conversation.
    # ========================================================

    practice_target = nanako_tutor.choose_practice_target(
        force=False
    )

    learner_summary = nanako_tutor.build_compact_learner_summary()

    scenario_guidance = nanako_scenarios.build_scenario_guidance(
        current_scenario,
        conversation_score
    )

    # ========================================================
    # 2. ONE LM STUDIO / QWEN REQUEST
    # ========================================================

    turn = nanako_tutor.call_unified_turn(
        system_prompt=SYSTEM_PROMPT,
        conversation_history=conversation_history,
        user_message=user_message,
        learner_summary=learner_summary,
        practice_target=practice_target,
        scenario_guidance=scenario_guidance,
        response_level=response_level
    )

    analysis = turn["analysis"]

    reply = turn["reply"]

    english = turn["english"]

    controlled_question = turn.get(
        "practice_question",
        ""
    ) or ""

    controlled_question_english = turn.get(
        "practice_question_english",
        ""
    ) or ""

    # ========================================================
    # 3. VALIDATE PRACTICE QUESTION
    # ========================================================

    if not practice_target:
        controlled_question = ""
        controlled_question_english = ""

    if (
        analysis.get("needs_correction")
        and analysis.get("severity") == "important"
    ):
        controlled_question = ""
        controlled_question_english = ""

    if analysis.get("intent", "conversation") != "conversation":
        controlled_question = ""
        controlled_question_english = ""

    # ========================================================
    # 4. SAVE PROGRESS + MASTERY
    # ========================================================

    nanako_tutor.save_progress(
        user_message,
        analysis
    )

    mastery_update = nanako_tutor.save_mastery(
        analysis
    )

    # ========================================================
    # 5. SCORE
    # ========================================================

    score_result = nanako_scoring.score_turn(
        user_message,
        analysis,
        practice_target=practice_target,
        previous_correction=last_correction
    )

    turn_score = score_result["score"]

    previous_score = conversation_score

    previous_stage = nanako_scenarios.get_stage_for_score(
        current_scenario,
        previous_score
    )

    conversation_score = nanako_scoring.advance_score(
        conversation_score,
        turn_score
    )

    current_stage = nanako_scenarios.get_stage_for_score(
        current_scenario,
        conversation_score
    )

    stage_changed = (
        current_stage["stage"]
        != previous_stage["stage"]
    )

    print()
    print(
        f"[Conversation score] +{turn_score} "
        f"({previous_score} → {conversation_score})"
    )

    # ========================================================
    # 6. REMEMBER CORRECTION
    # ========================================================

    if (
        analysis.get("needs_correction")
        and analysis.get("corrected")
    ):

        last_correction = {
            "original": analysis.get("original", ""),
            "corrected": analysis.get("corrected", "")
        }

    # ========================================================
    # 7. DEBUG
    # ========================================================

    nanako_tutor.print_debug(
        analysis,
        mastery_update,
        practice_target,
        controlled_question,
        forced=False
    )

    # ========================================================
    # 8. APPEND CONTROLLED QUESTION
    # ========================================================

    final_reply = nanako_tutor.append_controlled_question(
        reply,
        controlled_question
    )

    final_english = english.strip()

    # Absolute product rule: Nanako speaks Japanese.
    # English remains available only as the UI translation.
    (
        final_reply,
        final_english
    ) = enforce_japanese_spoken_reply(
        final_reply,
        final_english
    )

    if controlled_question:

        if controlled_question_english:

            if final_english:
                final_english += "\n"

            final_english += controlled_question_english.strip()

    # ========================================================
    # 9. HISTORY
    # ========================================================

    conversation_history.append(
        {
            "role": "user",
            "content": user_message
        }
    )

    conversation_history.append(
        {
            "role": "assistant",
            "content": final_reply
        }
    )

    nanako_tutor.trim_history(
        conversation_history
    )

    # ========================================================
    # 10. SCENARIO STATE
    # ========================================================

    scenario_state = nanako_scenarios.build_scenario_state(
        current_scenario,
        conversation_score
    )

    return {
        "reply": final_reply,
        "english": final_english,
        "analysis": analysis,
        "practice_target": practice_target,
        "controlled_question": controlled_question,
        "turn_score": turn_score,
        "conversation_score": conversation_score,
        "score_reasons": score_result["reasons"],
        "successful_target": score_result["successful_target"],
        "scenario": scenario_state,
        "stage_changed": stage_changed,
        "response_level": response_level
    }


# ============================================================
# COMMON RESPONSE BUILDER
# ============================================================

def build_response_data(
    result,
    romaji,
    transcript=None,
    audio_base64="",
    audio_mime=""
):

    analysis = result["analysis"]

    practice_target = result["practice_target"]

    successful_communication = bool(
        analysis.get("contains_japanese", False)
        and result.get("reply")
    )

    data = {
        "ok": True,
        "reply": result["reply"],
        "romaji": romaji,
        "english": result.get("english", ""),
        "response_level": result.get("response_level", "auto"),

        # Top-level score fields are deliberately included so
        # the current frontend meter can read them directly.
        "conversation_score": result["conversation_score"],
        "score_delta": result["turn_score"],
        "successful_communication": successful_communication,

        "analysis": {
            "contains_japanese": analysis.get(
                "contains_japanese",
                False
            ),
            "intent": analysis.get(
                "intent",
                "unknown"
            ),
            "needs_correction": analysis.get(
                "needs_correction",
                False
            ),
            "severity": analysis.get(
                "severity",
                "none"
            ),
            "original": analysis.get(
                "original",
                ""
            ),
            "corrected": analysis.get(
                "corrected",
                ""
            ),
            "reason": analysis.get(
                "reason",
                ""
            ),
            "category": analysis.get(
                "category",
                ""
            ),
            "demonstrated_skills": analysis.get(
                "demonstrated_skills",
                []
            ),
            "naturalness_note": analysis.get(
                "naturalness_note",
                ""
            ),
            "social_note": analysis.get(
                "social_note",
                ""
            ),
            "language_help": analysis.get(
                "language_help",
                ""
            ),
            "confidence": analysis.get(
                "confidence",
                0.0
            ),
            "successful_communication": successful_communication
        },

        "practice": {
            "skill": (
                practice_target.get("skill_name", "")
                if practice_target
                else ""
            ),
            "question": result["controlled_question"] or ""
        },

        "score": {
            "turn": result["turn_score"],
            "total": result["conversation_score"],
            "reasons": result["score_reasons"],
            "successful_target": result["successful_target"]
        },

        "scenario": result["scenario"],
        "stage_changed": result["stage_changed"]
    }

    if transcript is not None:
        data["transcript"] = transcript

    if audio_base64:
        data["audio_base64"] = audio_base64
        data["audio_mime"] = audio_mime

    return data


# ============================================================
# HOME
# ============================================================

@app.route("/health", methods=["GET"])
def health():

    return jsonify(
        {
            "ok": True,
            "service": "nanako",
            "deployment": "alibaba-function-compute"
        }
    )


@app.route("/")
def index():

    return render_template(
        "index.html",
        opening_message=opening_message
    )


# ============================================================
# TEXT CHAT
# ============================================================

@app.route(
    "/api/chat",
    methods=["POST"]
)
def chat():

    data = request.get_json(
        silent=True
    ) or {}

    user_message = str(
        data.get("message", "")
    ).strip()

    response_level = normalize_japanese_level(
        data.get("level", "auto")
    )

    if not user_message:

        return jsonify(
            {
                "ok": False,
                "error": "Message is empty."
            }
        ), 400

    try:

        request_start = time.monotonic()

        result = process_nanako_message(
            user_message,
            response_level=response_level
        )

        final_reply = result["reply"]

        romaji = generate_romaji(
            final_reply
        )

        wav_bytes = generate_tts_wav(
            final_reply
        )

        audio_base64 = ""

        if wav_bytes:
            audio_base64 = (
                base64.b64encode(wav_bytes)
                .decode("ascii")
            )

        elapsed = time.monotonic() - request_start

        print(
            f"[Web chat total: {elapsed:.2f}s]"
        )

        return jsonify(
            build_response_data(
                result,
                romaji,
                audio_base64=audio_base64,
                audio_mime="audio/wav"
            )
        )

    except Exception as error:

        print(
            "[Web chat error]",
            error
        )

        return jsonify(
            {
                "ok": False,
                "error": str(error)
            }
        ), 500


# ============================================================
# VOICE CHAT
# ============================================================

@app.route(
    "/api/voice",
    methods=["POST"]
)
def voice_chat():

    if "audio" not in request.files:

        return jsonify(
            {
                "ok": False,
                "error": "No audio file received."
            }
        ), 400

    audio_file = request.files["audio"]

    temp_path = None

    try:

        request_start = time.monotonic()

        suffix = os.path.splitext(
            audio_file.filename
        )[1]

        if not suffix:
            suffix = ".webm"

        temp_file = tempfile.NamedTemporaryFile(
            suffix=suffix,
            delete=False
        )

        temp_path = temp_file.name

        audio_file.save(temp_path)

        temp_file.close()

        # ====================================================
        # WHISPER
        # ====================================================

        transcript = transcribe_audio(
            temp_path
        )

        if not transcript:

            # A normal "nothing meaningful was spoken" result.
            # Return HTTP 200 so the frontend can quietly resume the
            # continuous listener. No Qwen, grammar, or TTS call runs.
            print(
                "[Voice gate] No transcript -> ignored turn; "
                "resuming listener."
            )

            return jsonify(
                {
                    "ok": True,
                    "ignored": True,
                    "reason": "no_speech",
                    "transcript": ""
                }
            ), 200

        # ====================================================
        # ONE NANAKO / QWEN TURN
        # ====================================================

        response_level = normalize_japanese_level(
            request.form.get("level", "auto")
        )

        result = process_nanako_message(
            transcript,
            response_level=response_level
        )

        final_reply = result["reply"]

        romaji = generate_romaji(
            final_reply
        )

        # ====================================================
        # TTS
        #
        # English is already inside the unified Qwen result,
        # so there is no second translation request anymore.
        # ====================================================

        wav_bytes = generate_tts_wav(
            final_reply
        )

        audio_base64 = ""

        if wav_bytes:
            audio_base64 = (
                base64.b64encode(wav_bytes)
                .decode("ascii")
            )

        elapsed = time.monotonic() - request_start

        print(
            f"[Web voice total: {elapsed:.2f}s]"
        )

        return jsonify(
            build_response_data(
                result,
                romaji,
                transcript=transcript,
                audio_base64=audio_base64,
                audio_mime="audio/wav"
            )
        )

    except Exception as error:

        print()
        print(
            "[Web voice error]",
            error
        )

        return jsonify(
            {
                "ok": False,
                "error": str(error)
            }
        ), 500

    finally:

        if temp_path:

            try:
                os.remove(temp_path)
            except Exception:
                pass


# ============================================================
# SCENARIO
# ============================================================

@app.route(
    "/api/scenario",
    methods=["GET"]
)
def scenario_state():

    state = nanako_scenarios.build_scenario_state(
        current_scenario,
        conversation_score
    )

    return jsonify(
        {
            "ok": True,
            "scenario": state
        }
    )


# ============================================================
# SCORE
# ============================================================

@app.route(
    "/api/score",
    methods=["GET"]
)
def score_state():

    return jsonify(
        {
            "ok": True,
            "score": conversation_score
        }
    )


# ============================================================
# PROGRESS
# ============================================================

@app.route(
    "/api/progress",
    methods=["GET"]
)
def progress():

    try:

        return jsonify(
            {
                "ok": True,
                "profile": nanako_progress.get_profile(),
                "stats": nanako_progress.get_stats(),
                "weak_skills": nanako_mastery.get_weak_skills(
                    limit=5,
                    minimum_attempts=2
                ),
                "strong_skills": nanako_mastery.get_strong_skills(
                    limit=5,
                    minimum_attempts=3
                ),
                "conversation_score": conversation_score,
                "scenario": nanako_scenarios.build_scenario_state(
                    current_scenario,
                    conversation_score
                )
            }
        )

    except Exception as error:

        return jsonify(
            {
                "ok": False,
                "error": str(error)
            }
        ), 500


# ============================================================
# RESET
# ============================================================

@app.route(
    "/api/reset",
    methods=["POST"]
)
def reset_chat():

    global conversation_score
    global last_correction

    conversation_score = 0
    last_correction = None

    conversation_history.clear()

    conversation_history.append(
        {
            "role": "assistant",
            "content": opening_message
        }
    )

    return jsonify(
        {
            "ok": True,
            "score": 0
        }
    )


# ============================================================
# RUN
# ============================================================

if __name__ == "__main__":

    print()
    print("=" * 60)
    print("NANAKO WEB — OPTIMIZED UNIFIED TURN BUILD")
    print("=" * 60)
    print()

    if NANAKO_ASR_MODE == "local":

        print(
            "Loading local Whisper..."
        )

        load_whisper()

    else:

        print(
            "Cloud ASR selected; local Whisper will "
            "load only if fallback is needed."
        )

        # Do this once at startup rather than adding setup latency
        # to the first spoken turn.
        if NANAKO_ASR_HOTWORDS:
            ensure_nanako_asr_hotwords()

    if NANAKO_TTS_MODE == "local":

        print(
            "Loading local Kokoro..."
        )

        load_kokoro()

    else:

        print(
            "Cloud TTS selected; local Kokoro will "
            "load only if fallback is needed."
        )

    print()
    print("=" * 60)
    print("NANAKO WEB READY")
    print("=" * 60)
    print()

    print("Alibaba Qwen unified turn: ENABLED")
    print("Separate 19s analyzer call: REMOVED FROM WEB PATH")
    print("Separate English translation call: REMOVED")
    print("Separate contextual-practice LLM call: REMOVED")
    print("Progress/mastery/scoring: ENABLED")
    print("Typed replies speak aloud: ENABLED")
    print("Voice replies speak aloud: ENABLED")
    print(
        f"ASR: {NANAKO_ASR_MODE.upper()} "
        f"({NANAKO_ASR_MODEL if NANAKO_ASR_MODE == 'cloud' else WHISPER_MODEL_NAME})"
    )
    print(
        f"ASR local fallback: "
        f"{'ENABLED' if NANAKO_ASR_FALLBACK else 'DISABLED'}"
    )
    print(
        f"ASR Nanako/Leo hotwords: "
        f"{'ACTIVE' if _nanako_asr_vocabulary_id else 'FALLBACK REPAIR ONLY'}"
    )
    print(
        "Nanako spoken-language guard: JAPANESE ONLY"
    )
    print(
        f"TTS: {NANAKO_TTS_MODE.upper()} "
        f"({NANAKO_TTS_MODEL + ' / ' + NANAKO_TTS_VOICE if NANAKO_TTS_MODE == 'cloud' else KOKORO_VOICE})"
    )
    print(
        f"TTS local fallback: "
        f"{'ENABLED' if NANAKO_TTS_FALLBACK else 'DISABLED'}"
    )
    print()
    print("Alibaba Function Compute Web Function | port 9000")
    print()

    app.run(
        host="0.0.0.0",
        port=int(os.getenv("FC_SERVER_PORT", "9000")),
        debug=False,
        threaded=True
    )
