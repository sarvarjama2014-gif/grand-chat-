import { useState, useRef, useEffect } from 'react'

export default function CallModal({ caller, incoming, user, onAccept, onReject, onEnd, socket, peerUser, addIceCandidateRef }) {
  const [muted, setMuted] = useState(false)
  const [speakerOn, setSpeakerOn] = useState(true)
  const [timer, setTimer] = useState(0)
  const [iceState, setIceState] = useState('connecting')
  const [micError, setMicError] = useState(null)
  const localAudioRef = useRef(null)
  const remoteAudioRef = useRef(null)
  const pcRef = useRef(null)
  const timerRef = useRef(null)
  const pendingCandidates = useRef([])
  const iceRestartRef = useRef(null)

  const ICE_SERVERS = [
    { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302', 'stun:stun3.l.google.com:19302', 'stun:stun4.l.google.com:19302'] },
    { urls: ['turn:openrelay.metered.ca:80', 'turn:openrelay.metered.ca:443', 'turns:openrelay.metered.ca:443'], username: 'openrelayproject', credential: 'openrelayproject' },
  ]

  const startTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(() => setTimer(t => t + 1), 1000)
  }

  useEffect(() => {
    if (!addIceCandidateRef) return
    addIceCandidateRef.current = (candidate) => {
      if (pcRef.current?.remoteDescription) {
        try { pcRef.current.addIceCandidate(new RTCIceCandidate(candidate)) } catch {}
      } else {
        pendingCandidates.current.push(candidate)
      }
    }
    return () => { addIceCandidateRef.current = null }
  }, [])

  const flushPending = () => {
    for (const c of pendingCandidates.current) {
      if (pcRef.current) {
        try { pcRef.current.addIceCandidate(new RTCIceCandidate(c)) } catch {}
      }
    }
    pendingCandidates.current = []
  }

  const startWebRTC = async () => {
    try {
      if (localAudioRef.current?.srcObject) {
        localAudioRef.current.srcObject.getTracks().forEach(t => t.stop())
        localAudioRef.current.srcObject = null
      }
      await new Promise(r => setTimeout(r, 500))
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        video: false
      })
      if (localAudioRef.current) localAudioRef.current.srcObject = stream

      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS })
      pcRef.current = pc
      flushPending()

      stream.getAudioTracks().forEach(track => pc.addTransceiver(track, { streams: [stream] }))

      pc.onicecandidate = (e) => {
        if (e.candidate && socket && peerUser) {
          socket.emit('ice-candidate', { to: peerUser, candidate: e.candidate })
        }
      }

      pc.ontrack = (e) => {
        if (remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = e.streams[0]
          remoteAudioRef.current.play().catch(() => {})
        }
      }

      pc.oniceconnectionstatechange = () => {
        setIceState(pc.iceConnectionState)
      }

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'failed') {
          setTimeout(() => {
            if (pcRef.current && !peerUser) return
            startWebRTC()
          }, 2000)
        }
      }

      if (user?.incomingSignal) {
        await pc.setRemoteDescription(new RTCSessionDescription(user.incomingSignal))
        flushPending()
        const answer = await pc.createAnswer()
        await pc.setLocalDescription(answer)
        if (socket && peerUser) {
          socket.emit('accept-call', { to: peerUser, signal: answer })
        }
        startTimer()
        scheduleIceRestart(pc)
      } else if (user?.outgoing) {
        const offer = await pc.createOffer()
        await pc.setLocalDescription(offer)
        if (socket && peerUser) {
          socket.emit('call-user', { to: peerUser, signal: offer })
        }
        scheduleIceRestart(pc)
      }
    } catch (e) {
      console.error('WebRTC error:', e)
      if (e.name === 'NotAllowedError' || e.name === 'PermissionDeniedError') {
        setMicError('blocked')
      } else {
        setTimeout(() => startWebRTC(), 2000)
      }
    }
  }

  const scheduleIceRestart = (pc) => {
    clearTimeout(iceRestartRef.current)
    iceRestartRef.current = setTimeout(() => {
      if (pc.iceConnectionState !== 'connected' && pc.iceConnectionState !== 'completed') {
        pc.restartIce()
        scheduleIceRestart(pc)
      }
    }, 8000)
  }

  useEffect(() => {
    if (user?.outgoing || user?.incomingSignal) {
      startWebRTC()
    }
    return () => {
      clearInterval(timerRef.current)
      clearTimeout(iceRestartRef.current)
      if (pcRef.current) {
        pcRef.current.onicecandidate = null
        pcRef.current.ontrack = null
        pcRef.current.close()
      }
      localAudioRef.current?.srcObject?.getTracks().forEach(t => t.stop())
    }
  }, [])

  useEffect(() => {
    if (!user?.signal || !pcRef.current) return
    if (pcRef.current.remoteDescription) return
    const doSet = async () => {
      try {
        await pcRef.current.setRemoteDescription(new RTCSessionDescription(user.signal))
        flushPending()
        startTimer()
      } catch (e) {
        console.error('setRemote error:', e)
      }
    }
    doSet()
  }, [user?.signal])

  const formatTimer = (s) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`
  }

  const toggleMute = () => {
    const next = !muted
    setMuted(next)
    if (localAudioRef.current?.srcObject) {
      localAudioRef.current.srcObject.getAudioTracks().forEach(t => t.enabled = !next)
    }
    if (socket && peerUser) {
      socket.emit('toggle-mic', { to: peerUser, muted: next })
    }
  }

  const toggleSpeaker = () => {
    setSpeakerOn(!speakerOn)
  }

  const PhoneIcon = ({ direction }) => (
    <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor">
      <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" transform={direction === 'down' ? 'rotate(135 12 12)' : ''} />
    </svg>
  )

  const MicIcon = ({ off }) => (
    <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor">
      {off ? (
        <path d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.33 3 2.99 3 .22 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5.1H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c.91-.13 1.77-.45 2.54-.9L19.73 21 21 19.73 4.27 3z" />
      ) : (
        <path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z" />
      )}
    </svg>
  )

  const SpeakerIcon = ({ on }) => (
    <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor">
      {on ? (
        <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
      ) : (
        <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
      )}
    </svg>
  )

  const callActive = user?.accepted || user?.incomingSignal

  if (incoming && caller) {
    return (
      <div className="call-overlay">
        <div className="call-card">
          <div className="call-avatar-big">
            {caller.fromAvatar ? <img src={caller.fromAvatar} alt="" /> : (caller.fromDisplayName || caller.fromUsername || '?').charAt(0).toUpperCase()}
          </div>
          <h2 className="call-name">{caller.fromDisplayName || caller.fromUsername}</h2>
          <div className="call-status">Incoming Call</div>
          <div className="call-buttons">
            <button className="call-btn call-btn-decline" onClick={onReject}>
              <PhoneIcon direction="down" />
            </button>
            <button className="call-btn call-btn-accept" onClick={onAccept}>
              <PhoneIcon />
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (user) {
    return (
      <div className="call-overlay">
        <audio ref={localAudioRef} muted autoPlay playsInline />
        <audio ref={remoteAudioRef} autoPlay playsInline />
        <div className="call-card">
          <div className="call-avatar-big">
            {user.avatar ? <img src={user.avatar} alt="" /> : (user.username || '?').charAt(0).toUpperCase()}
          </div>
          <h2 className="call-name">{user.username}</h2>
          {micError === 'blocked' ? (
            <div className="call-status" style={{ fontSize: 12, color: '#ff4444', padding: '0 10px' }}>
              Click 🔒 in address bar → Microphone → Allow → Reload page (F5)
              <br /><br />
              <button onClick={() => { setMicError(null); startWebRTC() }}
                style={{ background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 20px', cursor: 'pointer', fontSize: 14 }}>
                Try Again
              </button>
            </div>
          ) : (
            <div className="call-status">{callActive ? formatTimer(timer) : iceState}</div>
          )}
          <div className="call-buttons">
            {callActive && (
              <button className={`call-btn call-btn-mute ${muted ? 'active' : ''}`} onClick={toggleMute}>
                <MicIcon off={muted} />
              </button>
            )}
            {callActive && (
              <button className={`call-btn call-btn-speaker ${speakerOn ? 'active' : ''}`} onClick={toggleSpeaker}>
                <SpeakerIcon on={speakerOn} />
              </button>
            )}
            <button className="call-btn call-btn-end" onClick={onEnd}>
              <PhoneIcon direction="down" />
            </button>
          </div>
        </div>
      </div>
    )
  }

  return null
}
