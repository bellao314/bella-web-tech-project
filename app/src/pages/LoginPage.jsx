import { useState } from "react"
import { useNavigate } from "react-router-dom"
import Icon from "../components/Icon"
import { postApi, setAuthToken } from "../lib/api"

export default function LoginPage() {
  const navigate = useNavigate()
  const [isSignUp, setIsSignUp] = useState(false)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [rememberMe, setRememberMe] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      if (isSignUp) {
        if (password.length < 6) {
          setError("Password must be at least 6 characters.")
          setLoading(false)
          return
        }
        if (password !== confirmPassword) {
          setError("Passwords do not match.")
          setLoading(false)
          return
        }

        const data = await postApi("/auth/register", {
          email,
          password,
          name: name.trim() || undefined,
        })

        setAuthToken(data.token, true)
        navigate("/map")
      } else {
        const data = await postApi("/auth/login", { email, password })

        setAuthToken(data.token, rememberMe)
        navigate("/map")
      }
    } catch (err) {
      setError(err.message || `Failed to ${isSignUp ? "create account" : "sign in"}. Please try again.`)
    } finally {
      setLoading(false)
    }
  }

  const toggleMode = (signUp) => {
    setIsSignUp(signUp)
    setError("")
    setPassword("")
    setConfirmPassword("")
  }

  return (
    <main className="login-screen d-flex flex-column align-items-center">
      <div className="d-flex flex-column align-items-start col-12 col-lg-6">
        <div className="brand-mark"><Icon name="pin" size={27} /></div>
        <div className="mt-5">
          <p className="eyebrow fs-5">{isSignUp ? "START EXPLORING" : "FIND YOUR FAVES"}</p>
          <p className="fs-6">
            {isSignUp
              ? "Create an account to discover independent vendors, save your favorites, and drop pins."
              : "Discover independent vendors, save the ones you love, and always know where to find them."}
          </p>
        </div>
      </div>

      <form className="login-form col-12 col-lg-6" onSubmit={handleSubmit}>
        {error && (
          <div
            style={{
              color: "#c92a2a",
              background: "#ffe3e3",
              border: "1px solid #ffa8a8",
              borderRadius: "10px",
              padding: "10px 12px",
              fontSize: "12px",
              lineHeight: 1.4,
              marginBottom: "8px",
            }}
          >
            {error}
          </div>
        )}

        {isSignUp && (
          <label>
            <span>Full name or Business Name</span>
            <div className="input-shell">
              <Icon name="user" size={18} />
              <input
                type="text"
                placeholder="Jane Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          </label>
        )}

        <label>
          <span>Email address</span>
          <div className="input-shell">
            <Icon name="mail" size={18} />
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
        </label>

        <label>
          <span>Password</span>
          <div className="input-shell">
            <Icon name="lock" size={18} />
            <input
              type="password"
              placeholder={isSignUp ? "Create a password (min. 6 chars)" : "Enter your password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
        </label>

        {isSignUp && (
          <label>
            <span>Confirm password</span>
            <div className="input-shell">
              <Icon name="lock" size={18} />
              <input
                type="password"
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
          </label>
        )}

        {!isSignUp && (
          <div className="form-helper">
            <label className="remember">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              <span>Remember me</span>
            </label>
            <button type="button" className="text-button">Forgot password?</button>
          </div>
        )}

        <button
          className="primary-button"
          type="submit"
          disabled={loading}
          style={isSignUp ? { marginTop: "20px" } : {}}
        >
          {loading
            ? (isSignUp ? "Creating account..." : "Signing in...")
            : (isSignUp ? <>Create account <Icon name="arrow" size={18} /></> : <>Sign in <Icon name="arrow" size={18} /></>)}
        </button>

        <p className="signup">
          {isSignUp ? (
            <>
              Already have an account?{" "}
              <button
                type="button"
                className="text-button"
                onClick={() => toggleMode(false)}
              >
                Sign in
              </button>
            </>
          ) : (
            <>
              New user?{" "}
              <button
                type="button"
                className="text-button"
                onClick={() => toggleMode(true)}
              >
                Create an account
              </button>
            </>
          )}
        </p>
      </form>
    </main>
  )
}
