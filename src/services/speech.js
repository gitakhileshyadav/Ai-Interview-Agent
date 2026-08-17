// speech.js — Web Speech API wrapper for STT and TTS
// Works natively in Chrome and Edge browsers

class SpeechService {
  constructor() {
    this.recognition = null
    this.synthesis = window.speechSynthesis
    this.isListening = false
    this.isSpeaking = false
    this.onTranscript = null
    this.onListeningStart = null
    this.onListeningEnd = null
    this.onSpeakingStart = null
    this.onSpeakingEnd = null
    this.onError = null
    this.selectedVoiceName = null
    
    this._initRecognition()
    this._selectVoice()
    if (this.synthesis) {
      this.synthesis.onvoiceschanged = () => this._selectVoice()
    }
  }

  _selectVoice() {
    if (!this.synthesis) return
    const voices = this.synthesis.getVoices()
    if (!voices || voices.length === 0) return

    // Prioritize high-quality professional English voices
    const voice = voices.find(v => v.name.includes('Google US English')) ||
                  voices.find(v => v.name.includes('Google UK English Female')) ||
                  voices.find(v => v.name.includes('Microsoft Zira')) ||
                  voices.find(v => v.name.includes('Microsoft David')) ||
                  voices.find(v => v.lang === 'en-US' && v.name.includes('Female')) ||
                  voices.find(v => v.lang.startsWith('en-US')) ||
                  voices.find(v => v.lang.startsWith('en')) ||
                  voices[0]

    if (voice) {
      this.selectedVoiceName = voice.name
      console.log('🎙️ Locked Selected AI Voice:', voice.name, `(${voice.lang})`)
    }
  }

  _initRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      console.warn('⚠️ Speech Recognition not supported in this browser')
      return
    }

    this.recognition = new SpeechRecognition()
    this.recognition.continuous = false
    this.recognition.interimResults = true
    this.recognition.lang = 'en-US'
    this.recognition.maxAlternatives = 1

    this.recognition.onstart = () => {
      this.isListening = true
      this.onListeningStart?.()
    }

    this.recognition.onend = () => {
      this.isListening = false
      this.onListeningEnd?.()
    }

    this.recognition.onerror = (event) => {
      this.isListening = false
      if (event.error !== 'aborted') {
        this.onError?.(`Speech error: ${event.error}`)
      }
    }

    this.recognition.onresult = (event) => {
      let interim = ''
      let final = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript
        if (event.results[i].isFinal) {
          final += transcript
        } else {
          interim += transcript
        }
      }
      if (final || interim) {
        this.onTranscript?.({ final: final.trim(), interim: interim.trim() })
      }
    }
  }

  /**
   * Start listening for user speech
   */
  startListening() {
    if (!this.recognition) {
      this.onError?.('Speech Recognition is not supported in this browser. Please use Chrome or Edge.')
      return
    }
    if (this.isListening) return
    if (this.isSpeaking) {
      this.synthesis.cancel()
      this.isSpeaking = false
    }
    try {
      this.recognition.start()
    } catch (e) {
      console.error('Recognition start error:', e)
    }
  }

  /**
   * Stop listening
   */
  stopListening() {
    if (this.recognition && this.isListening) {
      this.recognition.stop()
    }
  }

  /**
   * Speak text aloud using TTS
   * @returns Promise that resolves when speaking is done
   */
  speak(text, options = {}) {
    return new Promise((resolve, reject) => {
      if (!this.synthesis) {
        reject(new Error('Speech Synthesis not supported'))
        return
      }

      this.synthesis.cancel()
      this.stopListening()

      const utterance = new SpeechSynthesisUtterance(text)
      utterance.rate = options.rate || 1.0
      utterance.pitch = options.pitch || 1.0
      utterance.volume = options.volume || 1.0
      utterance.lang = 'en-US'

      // Use locked professional English voice
      const voices = this.synthesis.getVoices()
      let voice = null
      if (this.selectedVoiceName) {
        voice = voices.find(v => v.name === this.selectedVoiceName)
      }
      if (!voice && voices.length > 0) {
        voice = voices.find(v => v.name.includes('Google US English')) ||
                voices.find(v => v.name.includes('Google UK English Female')) ||
                voices.find(v => v.name.includes('Microsoft Zira')) ||
                voices.find(v => v.name.includes('Microsoft David')) ||
                voices.find(v => v.lang === 'en-US' && v.name.includes('Female')) ||
                voices.find(v => v.lang.startsWith('en-US')) ||
                voices.find(v => v.lang.startsWith('en')) ||
                voices[0]
      }
      if (voice) {
        utterance.voice = voice
        // Explicitly set lang to match the selected voice to ensure professional en accent
        utterance.lang = voice.lang
      }

      utterance.onstart = () => {
        this.isSpeaking = true
        this.onSpeakingStart?.()
      }

      utterance.onend = () => {
        this.isSpeaking = false
        this.onSpeakingEnd?.()
        resolve()
      }

      utterance.onerror = (e) => {
        this.isSpeaking = false
        reject(e)
      }

      this.synthesis.speak(utterance)
    })
  }

  /**
   * Stop speaking immediately
   */
  stopSpeaking() {
    if (this.synthesis) {
      this.synthesis.cancel()
      this.isSpeaking = false
    }
  }

  /**
   * Check browser support
   */
  static isSupported() {
    return !!(window.SpeechRecognition || window.webkitSpeechRecognition)
  }

  /**
   * Get available TTS voices
   */
  getVoices() {
    return this.synthesis?.getVoices() || []
  }

  destroy() {
    this.stopListening()
    this.stopSpeaking()
    this.recognition = null
  }
}

export default SpeechService
