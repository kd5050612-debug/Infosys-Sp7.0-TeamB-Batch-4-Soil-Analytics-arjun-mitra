import { useEffect, useRef, useState } from "react";
import {
  Star,
  Send,
  Sprout,
  MessageCircle,
  CheckCircle2,
  Leaf,
} from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import "./FeedbackSection.css";

gsap.registerPlugin(ScrollTrigger);

export default function FeedbackSection() {
  const sectionRef = useRef(null);
  const [rating, setRating] = useState(0);
  const [category, setCategory] = useState("Overall experience");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(".feedback-intro > *", {
        y: 25,
        opacity: 0,
        duration: 0.8,
        stagger: 0.12,
        ease: "power3.out",
        scrollTrigger: {
          trigger: ".feedback-intro",
          start: "top 85%",
        },
      });

      gsap.from(".feedback-form-card", {
        y: 35,
        opacity: 0,
        duration: 0.8,
        ease: "power3.out",
        scrollTrigger: {
          trigger: ".feedback-form-card",
          start: "top 85%",
        },
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (!rating) {
      setError("Please select a star rating.");
      return;
    }

    if (message.trim().length < 10) {
      setError("Please write at least 10 characters of feedback.");
      return;
    }

    setSubmitted(true);
  }

  function resetForm() {
    setRating(0);
    setCategory("Overall experience");
    setMessage("");
    setSubmitted(false);
    setError("");
  }

  return (
    <section className="feedback-section" ref={sectionRef}>
      <div className="feedback-container">
        <div className="feedback-intro">
          <span className="feedback-eyebrow">
            <MessageCircle size={16} />
            YOUR VOICE MATTERS
          </span>

          <h2>
            Help us grow
            <br />
            <span>something meaningful.</span>
          </h2>

          <p>
            Your suggestions help us shape a more useful soil analytics
            experience for farmers and agricultural communities.
          </p>

          <div className="feedback-promise">
            <div className="feedback-promise-icon">
              <Leaf size={21} />
            </div>
            <div>
              <strong>Every suggestion counts</strong>
              <span>Help us make agricultural technology more accessible.</span>
            </div>
          </div>
        </div>

        <div className="feedback-form-card">
          {submitted ? (
            <div className="feedback-success">
              <div className="feedback-success-icon">
                <CheckCircle2 size={42} />
              </div>

              <h3>Thank you for your feedback!</h3>

              <p>
                Your feedback has been accepted in this demo. It has not yet
                been saved to the server.
              </p>

              <button
                type="button"
                className="feedback-reset-button"
                onClick={resetForm}
              >
                Submit another review
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="feedback-form-heading">
                <div>
                  <span className="feedback-form-kicker">AGRI SYNC COMMUNITY</span>
                  <h3>Share your experience</h3>
                </div>

                <div className="feedback-form-leaf">
                  <Sprout size={25} />
                </div>
              </div>

              <div className="feedback-rating-group">
                <label>How would you rate AgriSync?</label>

                <div className="feedback-star-row">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <button
                      type="button"
                      key={value}
                      className={`feedback-star-button ${
                        value <= rating ? "active" : ""
                      }`}
                      onClick={() => setRating(value)}
                      aria-label={`Rate ${value} out of 5 stars`}
                      aria-pressed={rating === value}
                    >
                      <Star
                        size={27}
                        fill={value <= rating ? "currentColor" : "none"}
                      />
                    </button>
                  ))}

                  <span className="feedback-rating-label">
                    {rating === 0
                      ? "Select rating"
                      : rating === 5
                        ? "Excellent"
                        : rating === 4
                          ? "Very good"
                          : rating === 3
                            ? "Good"
                            : rating === 2
                              ? "Fair"
                              : "Needs improvement"}
                  </span>
                </div>
              </div>

              <div className="feedback-field">
                <label htmlFor="feedback-category">Feedback category</label>

                <select
                  id="feedback-category"
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                >
                  <option>Overall experience</option>
                  <option>Soil analysis</option>
                  <option>Crop recommendations</option>
                  <option>Ease of use</option>
                  <option>Design and accessibility</option>
                  <option>Other suggestions</option>
                </select>
              </div>

              <div className="feedback-field">
                <label htmlFor="feedback-message">Tell us more</label>

                <textarea
                  id="feedback-message"
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  placeholder="What did you like? What can we improve?"
                  rows={5}
                  maxLength={1000}
                  required
                />

                <span className="feedback-character-count">
                  {message.length}/1000 characters
                </span>
              </div>

              {error && (
                <p className="feedback-error" role="alert">
                  {error}
                </p>
              )}

              <button type="submit" className="feedback-submit-button">
                Submit feedback
                <Send size={17} />
              </button>

              <p className="feedback-privacy-note">
                Your feedback will be ready for backend integration.
              </p>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}