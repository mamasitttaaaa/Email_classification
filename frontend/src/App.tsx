import React, { useRef, useState, FormEvent, useEffect } from 'react'

type Prediction = { category: string } | null

export default function App(): JSX.Element {
  // ref to the form container
  const formRef = useRef<HTMLElement | null>(null)

  // state: email text and prediction result
  const [emailText, setEmailText] = useState<string>('')
  const [prediction, setPrediction] = useState<Prediction>(null)

  // revealed controls whether the form is shown (either by click or by scroll into view)
  const [revealed, setRevealed] = useState<boolean>(false)

  // scroll smoothly to the bottom and reveal the form
  const goToPrediction = (): void => {
    setRevealed(true)
    setTimeout(() => {
      window.scrollTo({
        top: document.body.scrollHeight,
        behavior: 'smooth'
      })
    }, 300)
  }

  // handle form submit
  const handlePredict = async (e: FormEvent) => {
    e.preventDefault()

    if (!emailText.trim()) {
      alert('Please paste or type an email text first.')
      return
    }

    try {
      const response = await fetch('http://127.0.0.1:8000/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: emailText }),
      })

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`)
      }

      const data = await response.json()
      setPrediction({ category: data.category })

      setTimeout(() => {
        window.scrollTo({
          top: document.body.scrollHeight,
          behavior: 'smooth',
        })
      }, 300)
    } catch (err) {
      console.error('Prediction failed:', err)
      alert('Something went wrong while predicting. Tru again later.')
    }
  }

  // reset form to classify another email
  const handleReset = (): void => {
    setPrediction(null)
    setEmailText('')
    setTimeout(() => {
      window.scrollTo({
        top: document.body.scrollHeight,
        behavior: 'smooth'
      })
    }, 300)
  }

  // IntersectionObserver: when the form region enters viewport -> reveal it
  useEffect(() => {
    const el = formRef.current
    if (!el) return

    // If already revealed (e.g. by click), do not observe
    if (revealed) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setRevealed(true)
            observer.disconnect()
          }
        })
      },
      { root: null, rootMargin: '0px', threshold: 0.15 }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [revealed])


  return (
    <div className="app-root">
      <header className="hero">
        <h1 className="hero-title">Discover your email's category</h1>
        <p className="hero-sub">Paste an email and find its category instantly.</p>

        <button className="btn primary" onClick={goToPrediction}>
          Go to prediction
        </button>
      </header>

      {/* Prediction section: it's present in DOM but hidden visually until `revealed` becomes true */}
      <main ref={formRef as any} className={`prediction-section ${revealed ? 'revealed' : 'hidden'}`}>
        {/* If no prediction yet, show textarea + predictive button */}
        {prediction === null ? (
          <form onSubmit={handlePredict} className="form-card">
            <label className="label">Email text</label>

            <div className="textarea-wrap">
              <textarea
                value={emailText}
                onChange={(e) => setEmailText(e.target.value)}
                placeholder="Paste the full email text here..."
                rows={10}
              />
            </div>

            <div style={{ marginTop: 12 }}>
              <button type="submit" className="btn secondary">
                Predict category
              </button>
            </div>
          </form>
        ) : (
          // After prediction: show result and allow classifying another email
          <div className="result-card">
            <h2 className="result-title">Prediction</h2>
            <p className="result-value">{prediction.category}</p>

            <div style={{ marginTop: 16 }}>
              <button onClick={handleReset} className="btn secondary">
                Classify another email
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
