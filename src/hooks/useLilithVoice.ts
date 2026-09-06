"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { getApiUrl } from "@/lib/utils"

const SESSION_KEY = "lilith_voice_session";

function saveSession(history: any[], isActive: boolean, sessionId: string, resumptionHandle?: string | null, voiceName?: string | null) {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify({
      history: history.slice(-20),
      isActive,
      sessionId,
      resumptionHandle,
      voiceName,
      timestamp: Date.now()
    }));
  } catch { }
}

function loadSession(): { history: any[]; isActive: boolean; sessionId: string; resumptionHandle?: string | null; voiceName?: string | null } | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (Date.now() - data.timestamp > 7200_000) return { ...data, isActive: false, resumptionHandle: null };
    return data;
  } catch {
    return null;
  }
}

export function useLilithVoice() {
  const [isRecordingVoice, setIsRecordingVoice] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isReadyToSpeak, setIsReadyToSpeak] = useState(false)

  const isSpeakingRef = useRef(false)
  const wsRef = useRef<WebSocket | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const micStreamRef = useRef<MediaStream | null>(null)
  const micWorkletNodeRef = useRef<AudioWorkletNode | null>(null)
  const shouldReconnectRef = useRef<boolean>(false)
  const nextPlaybackTimeRef = useRef<number>(0)
  const activeSourcesRef = useRef<AudioBufferSourceNode[]>([])
  const currentUtteranceRef = useRef<{ userText: string; modelText: string }>({ userText: "", modelText: "" })
  const turnCounterRef = useRef<number>(0)

  const sessionIdRef = useRef<string>("")
  const resumptionHandleRef = useRef<string | null>(null)
  const conversationHistoryRef = useRef<any[]>([])
  const voiceNameRef = useRef<string | null>(null)

  useEffect(() => {
    const savedSession = loadSession();
    sessionIdRef.current = savedSession?.sessionId ?? `live_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    resumptionHandleRef.current = savedSession?.resumptionHandle ?? null;
    conversationHistoryRef.current = savedSession?.history ?? [];
    voiceNameRef.current = savedSession?.voiceName ?? null;
  }, []);

  const persistResumptionHandle = useCallback((handle: string) => {
    if (handle === resumptionHandleRef.current) return
    resumptionHandleRef.current = handle
  }, [])

  const saveHistoryToSupabase = async () => {
    const userId = "8024902234";
    await fetch("/api/config/voice-history", {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, history: conversationHistoryRef.current.slice(-20), sessionId: sessionIdRef.current })
    })
  }

  const stopAllPlayback = useCallback(() => {
    activeSourcesRef.current.forEach(source => { try { source.stop() } catch (e) { } })
    activeSourcesRef.current = []
    nextPlaybackTimeRef.current = 0
    setIsSpeaking(false)
    isSpeakingRef.current = false
  }, [])

  const cleanupAudio = useCallback(() => {
    stopAllPlayback()
    if (micWorkletNodeRef.current) {
      try { micWorkletNodeRef.current.disconnect() } catch (e) { }
      micWorkletNodeRef.current = null
    }
    if (micStreamRef.current) {
      try { micStreamRef.current.getTracks().forEach(track => track.stop()) } catch (e) { }
      micStreamRef.current = null
    }
  }, [stopAllPlayback])

  const stopLiveDialog = useCallback(() => {
    shouldReconnectRef.current = false
    cleanupAudio()
    if (wsRef.current) { 
      try { 
        wsRef.current.onclose = null
        wsRef.current.close() 
      } catch (e) { } 
      wsRef.current = null 
    }
    setIsRecordingVoice(false)
    setIsReadyToSpeak(false)
    saveSession(conversationHistoryRef.current, false, sessionIdRef.current, resumptionHandleRef.current, voiceNameRef.current)
  }, [cleanupAudio])

  const convertFloat32ToPcmBase64 = (inputData: Float32Array) => {
    const pcmData = new Int16Array(inputData.length)
    for (let i = 0; i < inputData.length; i++) {
      const s = Math.max(-1, Math.min(1, inputData[i]))
      pcmData[i] = s < 0 ? s * 32768 : s * 32767
    }
    const bytes = new Uint8Array(pcmData.buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }

  const startLiveDialog = async () => {
    if (window.speechSynthesis) window.speechSynthesis.cancel()
    setIsRecordingVoice(true)
    shouldReconnectRef.current = true

    // Garante limpeza completa de qualquer instância anterior antes de conectar
    cleanupAudio()
    if (wsRef.current) {
      try {
        wsRef.current.onclose = null
        wsRef.current.close()
      } catch (e) {}
      wsRef.current = null
    }

    try {
      const res = await fetch(getApiUrl(`/api/config/gemini-live-setup?sessionId=${sessionIdRef.current}`))
      const { key: apiKey, tools, systemInstruction: customInstruction, voiceName } = await res.json()

      if (!apiKey) {
        setIsRecordingVoice(false)
        return
      }

      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 })
      }
      if (audioCtxRef.current.state === 'suspended') await audioCtxRef.current.resume()

      const micProcessorName = `mic-processor-${Date.now()}`;
      const workletCode = `
        class MicProcessor extends AudioWorkletProcessor {
          process(inputs, outputs, parameters) {
            const input = inputs[0];
            if (input && input.length > 0 && input[0] && input[0].length > 0) {
              let isTalking = false;
              for (let i = 0; i < input[0].length; i += 10) {
                if (Math.abs(input[0][i]) > 0.05) { isTalking = true; break; }
              }
              this.port.postMessage({ data: input[0], isTalking });
            }
            return true;
          }
        }
        registerProcessor('${micProcessorName}', MicProcessor);
      `;
      const blob = new Blob([workletCode], { type: 'application/javascript' });
      const workletUrl = URL.createObjectURL(blob);
      await audioCtxRef.current.audioWorklet.addModule(workletUrl);
      URL.revokeObjectURL(workletUrl);

      const micStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      })
      micStreamRef.current = micStream
      const micSource = audioCtxRef.current.createMediaStreamSource(micStream)
      const micWorkletNode = new AudioWorkletNode(audioCtxRef.current, micProcessorName);
      micWorkletNodeRef.current = micWorkletNode

      const silentGain = audioCtxRef.current.createGain()
      silentGain.gain.value = 0
      micWorkletNode.connect(silentGain)
      silentGain.connect(audioCtxRef.current.destination)

      let setupComplete = false
      let audioPipelineStarted = false
      
      const savedVoiceName = voiceNameRef.current
      let resumeHandleUsed = resumptionHandleRef.current
      if (savedVoiceName && voiceName && savedVoiceName !== voiceName) {
        console.log('[useLilithVoice] Configuração de voz mudou de', savedVoiceName, 'para', voiceName, '- descartando resumption handle.');
        resumeHandleUsed = null
        resumptionHandleRef.current = null
      }
      voiceNameRef.current = voiceName || "Leda"

      const startAudioPipeline = () => {
        if (audioPipelineStarted || ws.readyState !== WebSocket.OPEN) return
        audioPipelineStarted = true

        micWorkletNode.port.onmessage = (e) => {
          if (ws.readyState !== WebSocket.OPEN) return
          const { data } = e.data;

          const base64Audio = convertFloat32ToPcmBase64(data)
          ws.send(JSON.stringify({ realtimeInput: { audio: { data: base64Audio, mimeType: "audio/pcm;rate=16000" } } }))
        }
        micSource.connect(micWorkletNode)
      }

      const ws = new WebSocket(`wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${apiKey}`)
      wsRef.current = ws

      ws.onclose = (event) => {
        if (resumeHandleUsed && !setupComplete) {
          console.warn('[Native Resumption] Falha ao retomar sessão, handle descartado:', event.reason || event.code)
          resumptionHandleRef.current = null
          saveSession(conversationHistoryRef.current, false, sessionIdRef.current, null, voiceNameRef.current)
        }
        setIsReadyToSpeak(false)

        // Auto-reconnect caso tenha caído inesperadamente
        if (shouldReconnectRef.current) {
          console.log('[useLilithVoice] Conexão encerrada inesperadamente. Reconectando em 3s...');
          cleanupAudio()
          setTimeout(() => {
            if (shouldReconnectRef.current) {
              startLiveDialog()
            }
          }, 3000)
        }
      };

      ws.onopen = () => {
        const formattedTools = [{
          functionDeclarations: (tools || []).concat([{
            name: "desligar_conexao",
            description: "Encerra a chamada.",
            parameters: { type: "OBJECT", properties: {} }
          }])
        }];

        const setupPayload: any = {
          model: "models/gemini-3.1-flash-live-preview",
          generationConfig: {
            responseModalities: ["AUDIO"],
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voiceName || "Leda" } } }
          },
          tools: formattedTools,
          systemInstruction: { parts: [{ text: customInstruction || "Você é Lilith..." }] },
          sessionResumption: resumeHandleUsed ? { handle: resumeHandleUsed } : {},
        };

        if (resumeHandleUsed) {
          console.log('[Native Resumption] Retomando sessão com handle:', resumeHandleUsed);
        }
        ws.send(JSON.stringify({ setup: setupPayload }));
      }

      ws.onmessage = async (event) => {
        const data = JSON.parse(typeof event.data === 'string' ? event.data : await event.data.text())

        if (data.setupComplete) {
          setupComplete = true
          startAudioPipeline()
          setIsReadyToSpeak(true)
          return
        }

        if (data.serverContent?.interrupted) { stopAllPlayback(); return }

        const resumptionUpdate = data.sessionResumptionUpdate;
        if (resumptionUpdate?.resumable && resumptionUpdate?.newHandle) {
          persistResumptionHandle(resumptionUpdate.newHandle)
        }

        const serverContent = data.serverContent;
        if (serverContent) {
          const modelTurn = serverContent.modelTurn;
          const userTurn = serverContent.userTurn;

          if (userTurn?.parts) {
            userTurn.parts.filter((p: any) => p.text).forEach((p: any) => currentUtteranceRef.current.userText += p.text);
          }

          if (modelTurn?.parts) {
            modelTurn.parts.filter((p: any) => p.text).forEach((p: any) => currentUtteranceRef.current.modelText += p.text);
          }
        }

        if (data.serverContent?.turnComplete) {
          const { userText, modelText } = currentUtteranceRef.current
          const displayUserText = userText || "[áudio do usuário]"

          if (userText || modelText) {
            conversationHistoryRef.current.push({ role: 'user', content: displayUserText, timestamp: new Date() })
            conversationHistoryRef.current.push({ role: 'model', content: modelText || "[áudio da Lilith]", timestamp: new Date() })

            fetch(getApiUrl("/api/docs/live-chat-log"), {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ userText: displayUserText, modelText: modelText || "[áudio da Lilith]", sessionId: sessionIdRef.current })
            })

            turnCounterRef.current++
            if (turnCounterRef.current >= 4) {
              saveHistoryToSupabase()
              turnCounterRef.current = 0
            }

            saveSession(conversationHistoryRef.current, true, sessionIdRef.current, resumptionHandleRef.current, voiceNameRef.current)
          }
          currentUtteranceRef.current = { userText: "", modelText: "" }
        }

        const modelParts = data.serverContent?.modelTurn?.parts || []
        const toolCall = data.toolCall || data.tool_call
        const functionCalls = [...(toolCall?.functionCalls || toolCall?.function_calls || []), ...modelParts.filter((p: any) => p.functionCall).map((p: any) => p.functionCall)]

        if (functionCalls.length > 0) {
          console.log('[ToolFunction]', functionCalls.map(f => f.name).join(', '));
          const responses = await Promise.all(functionCalls.map(async (f: any) => {
            if (f.name === "desligar_conexao") { setTimeout(stopLiveDialog, 400); return { name: f.name, id: f.id, response: { status: "success" } } }
            if (f.name === "navigate_url") {
              const url = f.args.url;
              if (url) {
                const finalUrl = url.startsWith('http') ? url : `https://${url}`;
                window.open(finalUrl, '_blank');
                return { name: f.name, id: f.id, response: { status: "success", message: `Navegando para ${finalUrl} no navegador do usuário.` } }
              }
            }
            const res = await fetch(getApiUrl("/api/tools/execute"), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: f.name, args: f.args }) })
            const result = await res.json()
            let finalResponse = result.status === 'success' ? (result.result || result) : { error: result.error || 'Erro desconhecido' };
            if (typeof finalResponse !== 'object' || finalResponse === null) {
              finalResponse = { result: finalResponse };
            }
            return { name: f.name, id: f.id, response: finalResponse }
          }))
          ws.send(JSON.stringify({ toolResponse: { functionResponses: responses } }))
          return
        }

        const audioPart = modelParts.find((p: any) => p.inlineData?.data)
        if (audioPart) {
          const binaryString = window.atob(audioPart.inlineData.data)
          const bytes = new Uint8Array(binaryString.length)
          for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i)
          const int16 = new Int16Array(bytes.buffer)
          const float32 = new Float32Array(int16.length)
          for (let i = 0; i < int16.length; i++) float32[i] = int16[i] / 32768.0
          const buffer = audioCtxRef.current!.createBuffer(1, float32.length, 24000)
          buffer.getChannelData(0).set(float32)
          const source = audioCtxRef.current!.createBufferSource()
          source.buffer = buffer
          source.connect(audioCtxRef.current!.destination)
          const now = audioCtxRef.current!.currentTime
          if (nextPlaybackTimeRef.current < now) nextPlaybackTimeRef.current = now + 0.04
          source.start(nextPlaybackTimeRef.current)
          nextPlaybackTimeRef.current += buffer.duration
          activeSourcesRef.current.push(source)
          setIsSpeaking(true)
          isSpeakingRef.current = true
          source.onended = () => {
            activeSourcesRef.current = activeSourcesRef.current.filter(s => s !== source);
            if (activeSourcesRef.current.length === 0) {
              setIsSpeaking(false)
              isSpeakingRef.current = false
            }
          }
        }
      }
    } catch (err) { stopLiveDialog() }
  }

  const sendTextToVoice = useCallback((text: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const textInput = {
        clientContent: {
          turns: [
            {
              role: "user",
              parts: [{ text }]
            }
          ],
          turnComplete: true
        }
      }
      currentUtteranceRef.current = { userText: currentUtteranceRef.current.userText + text, modelText: currentUtteranceRef.current.modelText }
      wsRef.current.send(JSON.stringify(textInput))
      return true
    }
    return false
  }, [])

  useEffect(() => {
    const handleBeforeUnload = () => {
      saveSession(conversationHistoryRef.current, isRecordingVoice, sessionIdRef.current, resumptionHandleRef.current, voiceNameRef.current);
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isRecordingVoice]);

  return {
    isRecordingVoice,
    isReadyToSpeak: isReadyToSpeak && !isSpeaking,
    isSpeaking,
    startLiveDialog,
    stopLiveDialog,
    toggleVoiceRecording: () => isRecordingVoice ? stopLiveDialog() : startLiveDialog(),
    sendTextToVoice,
    sessionId: sessionIdRef.current
  }
}