"use client"

import { LilithLogo } from "./LilithLogo"

interface LilithCoreProps {
  isRecordingVoice: boolean;
  isReadyToSpeak?: boolean;
  isSpeaking: boolean;
  toggleVoiceRecording: () => void;
}

export function LilithCore({ isRecordingVoice, isReadyToSpeak, isSpeaking, toggleVoiceRecording }: LilithCoreProps) {
  return (
    <div 
      onClick={toggleVoiceRecording}
      className={`group relative overflow-hidden select-none cursor-pointer p-3.5 rounded-xl border transition-all duration-500 flex flex-col gap-3 ${
        isRecordingVoice 
          ? isReadyToSpeak 
            ? 'border-emerald-500/50 bg-gradient-to-b from-emerald-950/20 via-zinc-950 to-zinc-950 shadow-[0_0_20px_rgba(16,185,129,0.15)]'
            : 'border-red-500/50 bg-gradient-to-b from-red-950/20 via-zinc-950 to-zinc-950 shadow-[0_0_20px_rgba(239,68,68,0.15)]'
          : 'border-zinc-850 bg-gradient-to-b from-zinc-900/40 via-zinc-950 to-zinc-950/80 hover:border-zinc-800 hover:shadow-[0_0_15px_rgba(0,0,0,0.7)]'
      }`}
    >
      <div className="flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 ${
              isRecordingVoice 
                ? isReadyToSpeak
                  ? 'bg-gradient-to-tr from-emerald-950/70 via-emerald-900/50 to-zinc-900 border border-emerald-500/80 shadow-[0_0_15px_rgba(16,185,129,0.55)]'
                  : 'bg-gradient-to-tr from-red-950/70 via-red-900/50 to-zinc-900 border border-red-500/80 shadow-[0_0_15px_rgba(239,68,68,0.55)]'
                : 'bg-gradient-to-tr from-zinc-950 via-zinc-900 to-zinc-850 border border-zinc-800/80 shadow-inner group-hover:border-zinc-700'
            }`}>
              <LilithLogo className={`w-5.5 h-5.5 transition-all duration-500 ${
                isRecordingVoice 
                  ? isReadyToSpeak ? 'text-emerald-500 scale-105' : 'text-red-500 scale-105'
                  : 'text-zinc-400 group-hover:text-zinc-300'
              }`} />
            </div>
            {isRecordingVoice && (
              <>
                <span className={`absolute inset-0 rounded-full border ${isReadyToSpeak ? 'border-emerald-500/30' : 'border-red-500/30'} animate-ping opacity-70`} />
                <span className={`absolute -inset-1.5 rounded-full border ${isReadyToSpeak ? 'border-emerald-500/10' : 'border-red-500/10'} animate-pulse opacity-40`} />
              </>
            )}
          </div>
          
          <div className="flex flex-col text-left">
            <span className={`text-[11.5px] font-sans font-bold text-zinc-100 tracking-wide uppercase transition-colors duration-300 ${
              isRecordingVoice 
                ? isReadyToSpeak ? 'group-hover:text-emerald-500/90' : 'group-hover:text-red-500/90'
                : 'group-hover:text-zinc-300'
            }`}>
              Lilith Core
            </span>
            <span className="text-[8.5px] font-mono tracking-wider text-zinc-500 mt-0.5 uppercase">
              {isRecordingVoice ? 'Voz Ativa' : 'Canal Auxiliar'}
            </span>
          </div>
        </div>

        <div className="flex items-center">
          <span className={`px-2 py-0.5 rounded text-[7px] font-mono tracking-wider font-bold uppercase transition-all duration-300 ${
            isRecordingVoice 
              ? isReadyToSpeak
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                : 'bg-red-500/10 text-red-400 border border-red-500/30'
              : 'bg-zinc-900/80 text-zinc-500 border border-zinc-800/50'
          }`}>
            {isRecordingVoice ? (isReadyToSpeak ? 'READY' : 'CONNECTING') : 'IDLE'}
          </span>
        </div>
      </div>

      <div className="h-8 flex items-center justify-between px-2.5 bg-black/60 rounded-lg border border-zinc-900/80 relative overflow-hidden z-10">
        {isRecordingVoice ? (
          <div className="flex items-center justify-center gap-[3.5px] w-full h-full">
            {isSpeaking ? (
              <>
                <span className={`w-0.5 rounded-full ${isReadyToSpeak ? 'bg-emerald-500' : 'bg-red-500'} animate-waveform-high h-4.5`} />
                <span className={`w-0.5 rounded-full ${isReadyToSpeak ? 'bg-emerald-500/95' : 'bg-red-500/95'} animate-waveform-mid h-3.5`} />
                <span className={`w-0.5 rounded-full ${isReadyToSpeak ? 'bg-emerald-500/90' : 'bg-red-500/90'} animate-waveform-low h-2.5`} />
                <span className={`text-[8px] font-mono ${isReadyToSpeak ? 'text-emerald-500' : 'text-red-500'} tracking-widest uppercase ml-2 select-none font-bold`}>SPEAKING</span>
              </>
            ) : (
              <>
                <span className={`w-0.5 rounded-full ${isReadyToSpeak ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-650 animate-pulse'} h-2`} />
                <span className={`text-[8px] font-mono ${isReadyToSpeak ? 'text-emerald-500' : 'text-zinc-500'} tracking-widest uppercase ml-2 select-none font-bold`}>
                  {isReadyToSpeak ? 'LISTENING (PRONTA)' : 'WAITING CONNECTION'}
                </span>
              </>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center gap-1.5 w-full h-full opacity-40 hover:opacity-75 transition-opacity duration-300">
            <span className="text-[8.5px] font-mono text-zinc-400 tracking-wider uppercase text-center select-none font-medium">
              Conectar canal de voz
            </span>
          </div>
        )}
      </div>
    </div>
  )
}





