import { useState } from "react"
import { useNavigate } from "react-router-dom"
import Icon from "../components/Icon"
import { postApi } from "../lib/api"
import { setStoredAccountType, saveBusinessData } from "../lib/business"
import { useAuth } from "../hooks/useAuth"
import vendorPic from "../assets/vendor-pic.jpg"

export default function LoginPage({ onLoginSuccess }) {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [isSignUp, setIsSignUp] = useState(false)
  const [isForgotPassword, setIsForgotPassword] = useState(false)
  const [accountType, setAccountType] = useState("customer")
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [successMessage, setSuccessMessage] = useState("")
  const [devResetLink, setDevResetLink] = useState("")

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")
    setSuccessMessage("")
    setDevResetLink("")
    setLoading(true)

    try {
      if (isForgotPassword) {
        if (!email.trim()) {
          setError("Please enter your email address.")
          setLoading(false)
          return
        }

        const data = await postApi("/auth/forgot-password", { email })
        setSuccessMessage("Password reset link sent! Check your email or use the link below.")
        if (data?.resetLink) {
          setDevResetLink(data.resetLink)
        }
      } else if (isSignUp) {
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
          type: accountType,
          accountType,
        })

        setStoredAccountType(accountType)
        if (accountType === "business") {
          saveBusinessData({ name: name.trim() || undefined })
        }
        login(data.token, true)
        if (onLoginSuccess) {
          onLoginSuccess(data)
        } else {
          navigate("/")
        }
      } else {
        const data = await postApi("/auth/login", { email, password })

        if (data.user?.accountType) {
          setStoredAccountType(data.user.accountType)
        }
        login(data.token)
        if (onLoginSuccess) {
          onLoginSuccess(data)
        } else {
          navigate("/")
        }
      }
    } catch (err) {
      setError(
        err.message ||
          `Failed to ${isForgotPassword ? "send reset link" : isSignUp ? "create account" : "sign in"}. Please try again.`
      )
    } finally {
      setLoading(false)
    }
  }

  const toggleMode = (signUp, forgot = false) => {
    setIsSignUp(signUp)
    setIsForgotPassword(forgot)
    setError("")
    setSuccessMessage("")
    setDevResetLink("")
    setPassword("")
    setConfirmPassword("")
    setAccountType("customer")
  }

  return (
    <main className="login-screen d-flex flex-column align-items-center">
      <div className="d-flex flex-column align-items-start col-12 col-lg-6">
        <div className="brand-mark"><Icon name="pin" size={27} /></div>
        <div className="mt-5">
          <p className="eyebrow fs-5">
            {isForgotPassword
              ? "RESET PASSWORD"
              : isSignUp
                ? (accountType === "business" ? "GROW YOUR BUSINESS" : "START EXPLORING")
                : "FIND YOUR FAVES"}
          </p>
          <p className="fs-6">
            {isForgotPassword
              ? "Enter your email address and we'll send you a link to reset your password."
              : isSignUp
                ? (accountType === "business"
                    ? "Create a business account to share your locations, manage your profile, and connect with customers."
                    : "Create an account to discover independent vendors and save your favorites.")
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

        {successMessage && (
          <div
            style={{
              color: "#2b8a3e",
              background: "#ebfbee",
              border: "1px solid #b2f2bb",
              borderRadius: "10px",
              padding: "10px 12px",
              fontSize: "12px",
              lineHeight: 1.4,
              marginBottom: "8px",
            }}
          >
            {successMessage}
          </div>
        )}

        {devResetLink && (
          <div
            style={{
              marginBottom: "12px",
              padding: "10px 12px",
              background: "#f1f3f5",
              border: "1px dashed #ced4da",
              borderRadius: "10px",
              fontSize: "12px",
            }}
          >
            <span style={{ fontWeight: 600, display: "block", marginBottom: "4px" }}>
              Development Mode:
            </span>
            <a
              href={devResetLink}
              style={{ color: "var(--forest)", wordBreak: "break-all" }}
            >
              Click here to test resetting password
            </a>
          </div>
        )}

        {isSignUp && !isForgotPassword && (
          <>
            <label htmlFor="accountType">
              <span>Account Type</span>
              <div className="input-shell">
                <Icon name={accountType === "business" ? "briefcase" : "user"} size={18} />
                <select
                  id="accountType"
                  name="accountType"
                  value={accountType}
                  onChange={(e) => setAccountType(e.target.value)}
                >
                  <option value="customer">Customer</option>
                  <option value="business">Business</option>
                </select>
              </div>
            </label>

            <label>
              <span>{accountType === "business" ? "Business Name" : "Full Name"}</span>
              <div className="input-shell">
                <Icon name={accountType === "business" ? "briefcase" : "user"} size={18} />
                <input
                  type="text"
                  placeholder={accountType === "business" ? "e.g. Acme Coffee Roasters" : "Jane Doe"}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            </label>
          </>
        )}

        {!isSignUp && !isForgotPassword && (
          <>
            <div className="vendor-pic-container ratio ratio-16x9 d-lg-none">
              <img className="vendor-pic" src={vendorPic} alt="Vendor Image by Kampus Production" />
              <div className="vendor-pic-overlay" aria-hidden="true" />
            </div>
            <div className="vendor-pic-container ratio ratio-21x9 d-none d-lg-block">
              <img className="vendor-pic" src={vendorPic} alt="Vendor Image by Kampus Production" />
              <div className="vendor-pic-overlay" aria-hidden="true" />
            </div>
          </>
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

        {!isForgotPassword && (
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
        )}

        {isSignUp && !isForgotPassword && (
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

        {!isSignUp && !isForgotPassword && (
          <div className="form-helper">
            <button
              type="button"
              className="text-button"
              onClick={() => toggleMode(false, true)}
            >
              Forgot password?
            </button>
          </div>
        )}

        <button
          className="primary-button"
          type="submit"
          disabled={loading}
          style={isSignUp || isForgotPassword ? { marginTop: "20px" } : {}}
        >
          {loading
            ? (isForgotPassword
                ? "Sending link..."
                : isSignUp
                  ? "Creating account..."
                  : "Signing in...")
            : (isForgotPassword
                ? <>Send reset link <Icon name="arrow" size={18} /></>
                : isSignUp
                  ? <>Create account <Icon name="arrow" size={18} /></>
                  : <>Sign in <Icon name="arrow" size={18} /></>)}
        </button>

        <p className="signup">
          {isForgotPassword ? (
            <>
              Remembered your password?{" "}
              <button
                type="button"
                className="text-button"
                onClick={() => toggleMode(false, false)}
              >
                Sign in
              </button>
            </>
          ) : isSignUp ? (
            <>
              Already have an account?{" "}
              <button
                type="button"
                className="text-button"
                onClick={() => toggleMode(false, false)}
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
                onClick={() => toggleMode(true, false)}
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
