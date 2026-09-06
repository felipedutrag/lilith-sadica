"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { getApiUrl } from "@/lib/utils"

interface VoiceAgentState {
  name: string;
  voiceName: string;
  isSpeaking: boolean;
  transcript: string;
}

interface AudioTurn {
  agentId: 'A' | 'B';
  buffers: AudioBuffer[];
  isComplete: boolean;
  transcript?: string;
}

export function useDualVoice() {
  const [isRecordingVoice, setIsRecordingVoice] = useState(false)

  const [agentA, setAgentA] = useState<VoiceAgentState>({
    name: "Lilith",
    voiceName: "Leda",
    isSpeaking: false,
    transcript: ""
  })

  const [agentB, setAgentB] = useState<VoiceAgentState>({
    name: "Zephyr",
    voiceName: "Zephyr",
    isSpeaking: false,
    transcript: ""
  })

  const [chatLogs, setChatLogs] = useState<{ role: string; text: string; timestamp: Date }[]>([])
  const chatLogsRef = useRef<{ role: string; text: string; timestamp: Date }[]>([])

  const addChatLog = useCallback((role: string, text: string) => {
    const newLog = { role, text, timestamp: new Date() }
    setChatLogs(prev => {
      const next = [...prev, newLog]
      chatLogsRef.current = next
      return next
    })
  }, [])

  const wsRefA = useRef<WebSocket | null>(null)
  const wsRefB = useRef<WebSocket | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const micStreamRef = useRef<MediaStream | null>(null)
  const nextPlaybackTimeRefA = useRef<number>(0)
  const nextPlaybackTimeRefB = useRef<number>(0)

  const sessionIdRef = useRef<string>("")
  const agentBNameRef = useRef<string>("Zephyr")

  const turnQueueRefA = useRef<AudioTurn[]>([])
  const turnQueueRefB = useRef<AudioTurn[]>([])
  const isAnySpeakingRef = useRef<boolean>(false)

  // Refs isoladas para saber quem está falando e evitar interrupções acidentais
  const isAgentASpeakingRef = useRef<boolean>(false)
  const isAgentBSpeakingRef = useRef<boolean>(false)
  const triggerPlaybackARef = useRef<() => void>(() => {})
  const triggerPlaybackBRef = useRef<() => void>(() => {})

  // Agora guardamos a qual agente pertence a fonte de áudio
  const activeSourcesRef = useRef<{ source: AudioBufferSourceNode, agentId: 'A' | 'B' }[]>([])

  const agentAGainNodeRef = useRef<GainNode | null>(null)
  const agentBGainNodeRef = useRef<GainNode | null>(null)

  const aiConsecutiveTurnsRef = useRef<number>(0)
  const lastSpeakerRef = useRef<'USER' | 'A' | 'B'>('USER')

  // Nova função de parada ISOLADA por agente (resolve o problema de "comer palavra")
  const stopAgentPlayback = useCallback((agentId: 'A' | 'B') => {
    activeSourcesRef.current = activeSourcesRef.current.filter(item => {
      if (item.agentId === agentId) {
        try { item.source.stop() } catch (e) { }
        return false;
      }
      return true;
    });

    if (agentId === 'A') {
      turnQueueRefA.current = [];
      setAgentA(p => ({ ...p, isSpeaking: false }));
      isAgentASpeakingRef.current = false;
      nextPlaybackTimeRefA.current = 0;
    } else {
      turnQueueRefB.current = [];
      setAgentB(p => ({ ...p, isSpeaking: false }));
      isAgentBSpeakingRef.current = false;
      nextPlaybackTimeRefB.current = 0;
    }

    isAnySpeakingRef.current = activeSourcesRef.current.length > 0;
  }, [])

  const stopAllPlayback = useCallback(() => {
    stopAgentPlayback('A');
    stopAgentPlayback('B');
  }, [stopAgentPlayback])

  const cleanupAudio = useCallback(() => {
    stopAllPlayback()
    if (micStreamRef.current) {
      try { micStreamRef.current.getTracks().forEach(track => track.stop()) } catch (e) { }
      micStreamRef.current = null
    }
  }, [stopAllPlayback])

  const stopLiveDialog = useCallback(() => {
    cleanupAudio()
    if (wsRefA.current) { try { wsRefA.current.close() } catch (e) { } wsRefA.current = null }
    if (wsRefB.current) { try { wsRefB.current.close() } catch (e) { } wsRefB.current = null }
    setIsRecordingVoice(false)
  }, [cleanupAudio])

  const finalizeTurn = useCallback((currentTurn: AudioTurn) => {
    if (currentTurn.agentId === 'A') {
      setAgentA(p => ({ ...p, isSpeaking: false }))
      isAgentASpeakingRef.current = false;
      triggerPlaybackBRef.current()
    } else {
      setAgentB(p => ({ ...p, isSpeaking: false }))
      isAgentBSpeakingRef.current = false;
      triggerPlaybackARef.current()
    }
    isAnySpeakingRef.current = activeSourcesRef.current.length > 0;

    if (currentTurn.transcript) {
      const cleanText = currentTurn.transcript
      const agentName = currentTurn.agentId === 'A' ? 'Lilith' : agentBNameRef.current

      fetch(getApiUrl("/api/docs/live-chat-log"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userText: "[Conversa Coletiva]",
          modelText: `${agentName}: ${cleanText}`,
          sessionId: sessionIdRef.current
        })
      }).catch(e => console.error('[DualVoice] Falha ao salvar log:', e));

      lastSpeakerRef.current = currentTurn.agentId;
      aiConsecutiveTurnsRef.current += 1;

      // Envia a fala transcrita de um agente para a outra IA via texto, permitindo que elas
      // se reconheçam mutuamente e conversem sem misturar as vozes ou interromper de forma errada.
      if (currentTurn.agentId === 'A') {
        if (wsRefB.current?.readyState === WebSocket.OPEN) {
          wsRefB.current.send(JSON.stringify({
            clientContent: {
              turns: [{ role: "user", parts: [{ text: `[Lilith disse: "${cleanText}"]` }] }],
              turnComplete: true
            }
          }));
        }
      } else {
        if (wsRefA.current?.readyState === WebSocket.OPEN) {
          wsRefA.current.send(JSON.stringify({
            clientContent: {
              turns: [{ role: "user", parts: [{ text: `[${agentBNameRef.current} disse: "${cleanText}"]` }] }],
              turnComplete: true
            }
          }));
        }
      }
    }
  }, [])

  const triggerPlaybackA = useCallback(function trigger() {
    if (turnQueueRefA.current.length === 0) return
    if (isAgentBSpeakingRef.current) return

    const currentTurn = turnQueueRefA.current[0]

    while (currentTurn.buffers.length > 0) {
      const nextBuffer = currentTurn.buffers.shift()!
      isAnySpeakingRef.current = true
      isAgentASpeakingRef.current = true
      setAgentA(p => ({ ...p, isSpeaking: true }))

      const source = audioCtxRef.current!.createBufferSource()
      source.buffer = nextBuffer
      source.connect(agentAGainNodeRef.current!)

      const now = audioCtxRef.current!.currentTime

      if (nextPlaybackTimeRefA.current < now + 0.15) {
        nextPlaybackTimeRefA.current = now + 0.15
      }

      source.start(nextPlaybackTimeRefA.current)
      nextPlaybackTimeRefA.current += nextBuffer.duration
      activeSourcesRef.current.push({ source, agentId: 'A' })

      source.onended = () => {
        activeSourcesRef.current = activeSourcesRef.current.filter(item => item.source !== source)
        if (activeSourcesRef.current.length === 0) isAnySpeakingRef.current = false;

        if (currentTurn.isComplete && currentTurn.buffers.length === 0 && !activeSourcesRef.current.some(s => s.agentId === 'A')) {
          finalizeTurn(currentTurn)
          turnQueueRefA.current.shift()
          trigger()
        }
      }
    }

    if (currentTurn.isComplete && currentTurn.buffers.length === 0 && !activeSourcesRef.current.some(s => s.agentId === 'A')) {
      finalizeTurn(currentTurn)
      turnQueueRefA.current.shift()
      trigger()
    }
  }, [finalizeTurn])
  triggerPlaybackARef.current = triggerPlaybackA

  const triggerPlaybackB = useCallback(function trigger() {
    if (turnQueueRefB.current.length === 0) return
    if (isAgentASpeakingRef.current) return

    const currentTurn = turnQueueRefB.current[0]

    while (currentTurn.buffers.length > 0) {
      const nextBuffer = currentTurn.buffers.shift()!
      isAnySpeakingRef.current = true
      isAgentBSpeakingRef.current = true
      setAgentB(p => ({ ...p, isSpeaking: true }))

      const source = audioCtxRef.current!.createBufferSource()
      source.buffer = nextBuffer
      source.connect(agentBGainNodeRef.current!)

      const now = audioCtxRef.current!.currentTime

      if (nextPlaybackTimeRefB.current < now + 0.15) {
        nextPlaybackTimeRefB.current = now + 0.15
      }

      source.start(nextPlaybackTimeRefB.current)
      nextPlaybackTimeRefB.current += nextBuffer.duration
      activeSourcesRef.current.push({ source, agentId: 'B' })

      source.onended = () => {
        activeSourcesRef.current = activeSourcesRef.current.filter(item => item.source !== source)
        if (activeSourcesRef.current.length === 0) isAnySpeakingRef.current = false;

        if (currentTurn.isComplete && currentTurn.buffers.length === 0 && !activeSourcesRef.current.some(s => s.agentId === 'B')) {
          finalizeTurn(currentTurn)
          turnQueueRefB.current.shift()
          trigger()
        }
      }
    }

    if (currentTurn.isComplete && currentTurn.buffers.length === 0 && !activeSourcesRef.current.some(s => s.agentId === 'B')) {
      finalizeTurn(currentTurn)
      turnQueueRefB.current.shift()
      trigger()
    }
  }, [finalizeTurn])
  triggerPlaybackBRef.current = triggerPlaybackB

  const queueAudioChunk = useCallback((base64Data: string, isAgentA: boolean) => {
    if (!audioCtxRef.current) return

    const binaryString = window.atob(base64Data)
    const int16 = new Int16Array(new Uint8Array(Array.from(binaryString).map(c => c.charCodeAt(0))).buffer)
    const float32 = new Float32Array(int16.length)
    for (let i = 0; i < int16.length; i++) float32[i] = int16[i] / 32768.0

    const buffer = audioCtxRef.current.createBuffer(1, float32.length, 24000)
    buffer.getChannelData(0).set(float32)

    if (isAgentA) {
      let activeTurn = turnQueueRefA.current.find(t => !t.isComplete)
      if (!activeTurn) {
        activeTurn = { agentId: 'A', buffers: [buffer], isComplete: false }
        turnQueueRefA.current.push(activeTurn)
      } else {
        activeTurn.buffers.push(buffer)
      }
      triggerPlaybackA()
    } else {
      let activeTurn = turnQueueRefB.current.find(t => !t.isComplete)
      if (!activeTurn) {
        activeTurn = { agentId: 'B', buffers: [buffer], isComplete: false }
        turnQueueRefB.current.push(activeTurn)
      } else {
        activeTurn.buffers.push(buffer)
      }
      triggerPlaybackB()
    }
  }, [triggerPlaybackA, triggerPlaybackB])

  const markTurnComplete = useCallback((isAgentA: boolean, transcript?: string) => {
    if (isAgentA) {
      const activeTurn = turnQueueRefA.current.find(t => !t.isComplete)
      if (activeTurn) {
        activeTurn.isComplete = true
        if (transcript) activeTurn.transcript = transcript
      }
      triggerPlaybackA()
    } else {
      const activeTurn = turnQueueRefB.current.find(t => !t.isComplete)
      if (activeTurn) {
        activeTurn.isComplete = true
        if (transcript) activeTurn.transcript = transcript
      }
      triggerPlaybackB()
    }
  }, [triggerPlaybackA, triggerPlaybackB])

  const convertFloat32ToPcmBase64 = (inputData: Float32Array) => {
    const pcmData = new Int16Array(inputData.length)
    for (let i = 0; i < inputData.length; i++) {
      const s = Math.max(-1, Math.min(1, inputData[i]))
      pcmData[i] = s < 0 ? s * 32768 : s * 32767
    }
    return window.btoa(String.fromCharCode(...new Uint8Array(pcmData.buffer)))
  }

  const startLiveDialog = async (voiceAName: string, voiceBName: string, customNameA?: string, customPromptA?: string, customNameB?: string, customPromptB?: string) => {
    if (window.speechSynthesis) window.speechSynthesis.cancel()
    setIsRecordingVoice(true)
    setChatLogs([])
    chatLogsRef.current = []
    aiConsecutiveTurnsRef.current = 0
    lastSpeakerRef.current = 'USER'

    const sessionId = `dual_voice_${Date.now()}`
    sessionIdRef.current = sessionId
    agentBNameRef.current = voiceBName

    try {
      const res = await fetch(getApiUrl(`/api/config/gemini-live-setup?sessionId=${sessionId}`))
      const { key: apiKey, tools: backendTools, systemInstruction: baseInstruction } = await res.json()

      if (!apiKey) {
        setIsRecordingVoice(false)
        return
      }

      setAgentA(p => ({ ...p, voiceName: voiceAName, isSpeaking: false, transcript: "" }))
      setAgentB(p => ({ ...p, name: voiceBName, voiceName: voiceBName, isSpeaking: false, transcript: "" }))

      let contextPart = ""
      if (baseInstruction) {
        const memoryIndex = baseInstruction.indexOf("\n\n[MEMÓRIA DA CONVERSA ATUAL]:")
        const transIndex = baseInstruction.indexOf("\n\n[CONTEXTO TRANS-CANAL - ÚLTIMAS 48H]:")
        let splitIndex = -1
        if (memoryIndex !== -1 && transIndex !== -1) splitIndex = Math.min(memoryIndex, transIndex)
        else if (memoryIndex !== -1) splitIndex = memoryIndex
        else if (transIndex !== -1) splitIndex = transIndex
        if (splitIndex !== -1) contextPart = baseInstruction.substring(splitIndex)
      }

      const customTools = [{
        functionDeclarations: (backendTools || []).concat([{
          name: "consultar_conversa_atual",
          description: "Consulta o histórico de mensagens em tempo real da chamada de voz coletiva atual.",
          parameters: { type: "OBJECT", properties: {} }
        }])
      }]

      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 })
      }
      if (audioCtxRef.current.state === 'suspended') await audioCtxRef.current.resume()

      agentAGainNodeRef.current = audioCtxRef.current.createGain()
      agentBGainNodeRef.current = audioCtxRef.current.createGain()
      agentAGainNodeRef.current.connect(audioCtxRef.current.destination)
      agentBGainNodeRef.current.connect(audioCtxRef.current.destination)

      const micProcessorName = `mic-processor-${Date.now()}`;
      const crossTalkProcessorName = `crosstalk-processor-${Date.now()}`;

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

        class CrossTalkProcessor extends AudioWorkletProcessor {
          process(inputs, outputs, parameters) {
            const inputA = inputs[0];
            const inputB = inputs[1];
            if (inputA && inputA.length > 0 && inputA[0] && inputA[0].length > 0) {
              this.port.postMessage({ agent: 'A', data: inputA[0] });
            }
            if (inputB && inputB.length > 0 && inputB[0] && inputB[0].length > 0) {
              this.port.postMessage({ agent: 'B', data: inputB[0] });
            }
            return true;
          }
        }
        registerProcessor('${crossTalkProcessorName}', CrossTalkProcessor);
      `;

      const blob = new Blob([workletCode], { type: 'application/javascript' });
      const workletUrl = URL.createObjectURL(blob);
      await audioCtxRef.current.audioWorklet.addModule(workletUrl);
      URL.revokeObjectURL(workletUrl);

      const micStream = await navigator.mediaDevices.getUserMedia({ audio: true })
      micStreamRef.current = micStream
      const micSource = audioCtxRef.current.createMediaStreamSource(micStream)
      const micWorkletNode = new AudioWorkletNode(audioCtxRef.current, micProcessorName);

      // Garante que o micWorkletNode seja processado imediatamente pela thread de áudio
      // do Chrome (sem isso, o Chrome otimiza/suspende o nó se não estiver conectado ao destination)
      const silentGain = audioCtxRef.current.createGain()
      silentGain.gain.value = 0
      micWorkletNode.connect(silentGain)
      silentGain.connect(audioCtxRef.current.destination)

      micWorkletNode.port.onmessage = (e) => {
        const { data, isTalking } = e.data;
        if (isTalking) {
          aiConsecutiveTurnsRef.current = 0;
          lastSpeakerRef.current = 'USER';
        }
        if (isAnySpeakingRef.current) return
        const base64Audio = convertFloat32ToPcmBase64(data)
        const payload = JSON.stringify({ realtimeInput: { audio: { data: base64Audio, mimeType: "audio/pcm;rate=16000" } } })
        if (wsRefA.current?.readyState === WebSocket.OPEN) wsRefA.current.send(payload)
        if (wsRefB.current?.readyState === WebSocket.OPEN) wsRefB.current.send(payload)
      }
      micSource.connect(micWorkletNode)

      const crossTalkWorkletNode = new AudioWorkletNode(audioCtxRef.current, crossTalkProcessorName, {
        numberOfInputs: 2,
        numberOfOutputs: 0
      });

      crossTalkWorkletNode.port.onmessage = (e) => {
        // Desativado: Impede que os agentes ouçam a voz um do outro como se fosse o usuário falando,
        // evitando respostas duplicadas e interrupções indesejadas.
      }

      agentAGainNodeRef.current.connect(crossTalkWorkletNode, 0, 0)
      agentBGainNodeRef.current.connect(crossTalkWorkletNode, 0, 1)

      const wsA = new WebSocket(`wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${apiKey}`)
      wsRefA.current = wsA

      const wsB = new WebSocket(`wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${apiKey}`)
      wsRefB.current = wsB

      let currentUtteranceA = ""
      let currentUtteranceB = ""

      wsA.onopen = () => {
        const setupPayload = {
          model: "models/gemini-3.1-flash-live-preview",
          generationConfig: {
            responseModalities: ["AUDIO"],
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voiceAName } } }
          },
          tools: customTools,
          systemInstruction: {
            parts: [{ text: customPromptA || `${baseInstruction}\n\nVocê é ${customNameA || "Lilith"}. Você está em uma chamada de voz coletiva com o usuário (Cadelo) e o parceiro ${customNameB || voiceBName}.\nREGRA VITAL: Responda de forma curta. NÃO converse com ${customNameB || voiceBName} a não ser que o usuário solicite explicitamente. Dirija-se apenas ao usuário e aguarde.` }]
          }
        }
        wsA.send(JSON.stringify({ setup: setupPayload }))
      }

      wsA.onmessage = async (event) => {
        const data = JSON.parse(typeof event.data === 'string' ? event.data : await event.data.text())
        if (data.serverContent?.interrupted) {
          console.log("[DualVoice] A IA A (Lilith) foi interrompida.")
          stopAgentPlayback('A') // FIX: Para APENAS a IA que foi interrompida
          return
        }
        const modelParts = data.serverContent?.modelTurn?.parts || []
        const toolCall = data.toolCall || data.tool_call
        const functionCalls = [...(toolCall?.functionCalls || toolCall?.function_calls || []), ...modelParts.filter((p: any) => p.functionCall).map((p: any) => p.functionCall)]

        if (functionCalls.length > 0) {
          const responses = await Promise.all(functionCalls.map(async (f: any) => {
            if (f.name === "consultar_conversa_atual") {
              const recentLogs = chatLogsRef.current.slice(-10).map(log => `${log.role}: "${log.text}"`).join('\n');
              return { name: f.name, id: f.id, response: { status: "success", resultado: recentLogs || "Nenhuma mensagem ainda." } }
            }
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
            return { name: f.name, id: f.id, response: result.status === 'success' ? (result.result || result) : { error: result.error } }
          }))
          wsA.send(JSON.stringify({ toolResponse: { functionResponses: responses } }))
          return
        }

        modelParts.filter((p: any) => p.text).forEach((p: any) => {
          currentUtteranceA += p.text
          setAgentA(prev => ({ ...prev, transcript: currentUtteranceA }))
        })

        const audioPart = modelParts.find((p: any) => p.inlineData?.data)
        if (audioPart) queueAudioChunk(audioPart.inlineData.data, true)

        if (data.serverContent?.turnComplete) {
          const cleanText = currentUtteranceA.trim()
          if (cleanText) addChatLog("Lilith", cleanText)
          markTurnComplete(true, cleanText)
          currentUtteranceA = ""
        }
      }

      wsB.onopen = () => {
        const setupPayload = {
          model: "models/gemini-3.1-flash-live-preview",
          generationConfig: {
            responseModalities: ["AUDIO"],
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voiceBName } } }
          },
          tools: customTools,
          systemInstruction: {
            parts: [{ text: customPromptB || `${baseInstruction}\n\nVocê é ${customNameB || voiceBName}, parceiro de ${customNameA || "Lilith"} em chamada com o usuário (Cadelo).\nREGRA VITAL: Responda em 1 ou 2 frases curtas. NÃO converse com ${customNameA || "Lilith"} a não ser que o usuário solicite explicitamente. Dirija-se apenas ao usuário e aguarde.${contextPart}` }]
          }
        }
        wsB.send(JSON.stringify({ setup: setupPayload }))
      }

      wsB.onmessage = async (event) => {
        const data = JSON.parse(typeof event.data === 'string' ? event.data : await event.data.text())
        if (data.serverContent?.interrupted) {
          console.log(`[DualVoice] A IA B (${agentBNameRef.current}) foi interrompida.`)
          stopAgentPlayback('B') // FIX: Para APENAS a IA que foi interrompida
          return
        }
        const modelParts = data.serverContent?.modelTurn?.parts || []
        const toolCall = data.toolCall || data.tool_call
        const functionCalls = [...(toolCall?.functionCalls || toolCall?.function_calls || []), ...modelParts.filter((p: any) => p.functionCall).map((p: any) => p.functionCall)]

        if (functionCalls.length > 0) {
          const responses = await Promise.all(functionCalls.map(async (f: any) => {
            if (f.name === "consultar_conversa_atual") {
              const recentLogs = chatLogsRef.current.slice(-10).map(log => `${log.role}: "${log.text}"`).join('\n');
              return { name: f.name, id: f.id, response: { status: "success", resultado: recentLogs || "Nenhuma mensagem ainda." } }
            }
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
            return { name: f.name, id: f.id, response: result.status === 'success' ? (result.result || result) : { error: result.error } }
          }))
          wsB.send(JSON.stringify({ toolResponse: { functionResponses: responses } }))
          return
        }

        modelParts.filter((p: any) => p.text).forEach((p: any) => {
          currentUtteranceB += p.text
          setAgentB(prev => ({ ...prev, transcript: currentUtteranceB }))
        })

        const audioPart = modelParts.find((p: any) => p.inlineData?.data)
        if (audioPart) queueAudioChunk(audioPart.inlineData.data, false)

        if (data.serverContent?.turnComplete) {
          const cleanText = currentUtteranceB.trim()
          if (cleanText) addChatLog(voiceBName, cleanText)
          markTurnComplete(false, cleanText)
          currentUtteranceB = ""
        }
      }

    } catch (err) {
      stopLiveDialog()
    }
  }

  const sendTextToGroup = useCallback((text: string) => {
    aiConsecutiveTurnsRef.current = 0;
    lastSpeakerRef.current = 'USER';

    const payload = JSON.stringify({ clientContent: { turns: [{ role: "user", parts: [{ text }] }], turnComplete: true } })
    let sent = false
    if (wsRefA.current?.readyState === WebSocket.OPEN) { wsRefA.current.send(payload); sent = true; }
    if (wsRefB.current?.readyState === WebSocket.OPEN) { wsRefB.current.send(payload); sent = true; }
    if (sent) addChatLog("Você", text)
    return sent
  }, [addChatLog])

  useEffect(() => {
    return () => {
      if (wsRefA.current) wsRefA.current.close()
      if (wsRefB.current) wsRefB.current.close()
    }
  }, [])

  return { isRecordingVoice, agentA, agentB, chatLogs, startLiveDialog, stopLiveDialog, sendTextToGroup, toggleVoiceRecording: (vA: string, vB: string, cNA?: string, cPA?: string, cNB?: string, cPB?: string) => isRecordingVoice ? stopLiveDialog() : startLiveDialog(vA, vB, cNA, cPA, cNB, cPB) }
}