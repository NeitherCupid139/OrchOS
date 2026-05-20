import { useState, useEffect, useCallback, useRef } from "react";

interface SpeechRecognitionAlternative {
  transcript: string;
}

interface SpeechRecognitionResultLike {
  isFinal: boolean;
  0: SpeechRecognitionAlternative;
}

interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
}

interface SpeechRecognitionErrorEventLike {
  error: string;
}

interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

interface SpeechRecognitionConstructorLike {
  new (): SpeechRecognitionLike;
}

interface UseSpeechRecognitionResult {
  isListening: boolean;
  transcript: string;
  isSupported: boolean;
  start: () => void;
  stop: () => void;
}

export function useSpeechRecognition(): UseSpeechRecognitionResult {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const shouldResumeRef = useRef(false);
  const restartTimeoutRef = useRef<number | null>(null);

  const isSupported =
    typeof window !== "undefined" &&
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

  useEffect(() => {
    if (!isSupported) return;

    const SpeechRecognitionAPI =
      (window as unknown as { SpeechRecognition?: SpeechRecognitionConstructorLike }).SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: SpeechRecognitionConstructorLike })
        .webkitSpeechRecognition;

    if (!SpeechRecognitionAPI) return;

    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = navigator.language || "en-US";

    recognition.onresult = (event: SpeechRecognitionEventLike) => {
      let finalTranscript = "";
      let interimTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        } else {
          interimTranscript += result[0].transcript;
        }
      }

      if (finalTranscript || interimTranscript) {
        setTranscript(finalTranscript + interimTranscript);
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEventLike) => {
      if (event.error === "aborted") {
        return;
      }

      if (event.error !== "no-speech") {
        console.error("Speech recognition error:", event.error);
      } else if (!shouldResumeRef.current) {
        setIsListening(false);
      }
    };

    recognition.onend = () => {
      if (!shouldResumeRef.current) {
        setIsListening(false);
        return;
      }

      restartTimeoutRef.current = window.setTimeout(() => {
        if (!shouldResumeRef.current) {
          setIsListening(false);
          return;
        }

        try {
          recognition.start();
          setIsListening(true);
        } catch (err) {
          console.error("Failed to restart speech recognition:", err);
          setIsListening(false);
        }
      }, 150);
    };

    recognitionRef.current = recognition;

    return () => {
      shouldResumeRef.current = false;
      if (restartTimeoutRef.current !== null) {
        window.clearTimeout(restartTimeoutRef.current);
      }
      recognition.abort();
    };
  }, [isSupported]);

  const start = useCallback(() => {
    if (!recognitionRef.current || isListening) return;
    shouldResumeRef.current = true;
    setTranscript("");
    try {
      recognitionRef.current.start();
      setIsListening(true);
    } catch (err) {
      shouldResumeRef.current = false;
      console.error("Failed to start speech recognition:", err);
    }
  }, [isListening]);

  const stop = useCallback(() => {
    if (!recognitionRef.current) return;
    shouldResumeRef.current = false;
    if (restartTimeoutRef.current !== null) {
      window.clearTimeout(restartTimeoutRef.current);
      restartTimeoutRef.current = null;
    }
    recognitionRef.current.stop();
    setIsListening(false);
  }, []);

  return {
    isListening,
    transcript,
    isSupported,
    start,
    stop,
  };
}
