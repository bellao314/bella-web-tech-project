import { useState } from "react"
import { useNavigate, useSearchParams, Link } from "react-router-dom"
import Icon from "../components/Icon"
import { postApi } from "../lib/api"

export default function ResetPasswordPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get("reset_tok") || searchParams.get("token") || ""

  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")

    if (!token) {
      setError("Reset token is missing or invalid.")
      return
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.")
      return
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.")
      return
    }

    setLoading(true)

    try {
      await postApi("/auth/reset-password", {
        token,
        newPassword: password,
      })
      setSuccess(true)
    } catch (err) {
      setError(err.message || "Failed to reset password. The link may be expired.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="login-screen d-flex flex-column align-items-center">
      <div className="d-flex flex-column align-items-start col-12 col-lg-6">
        <div className="brand-mark"><Icon name="pin" size={27} /></div>
        <div className="mt-5">
          <p className="eyebrow fs-5">CHOOSE NEW PASSWORD</p>
          <p className="fs-6">
            {success
              ? "Your password has been reset successfully."
              : "Enter a new password for your account."}
          </p>
        </div>
      </div>

      <div className="col-12 col-lg-6 w-100" style={{ maxWidth: "500px" }}>
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
              marginBottom: "14px",
            }}
          >
            {error}
          </div>
        )}

        {success ? (
          <div
            style={{
              background: "#ebfbee",
              border: "1px solid #b2f2bb",
              borderRadius: "12px",
              padding: "24px 20px",
              textAlign: "center",
              marginTop: "20px",
            }}
          >
            <div
              style={{
                width: "42px",
                height: "42px",
                borderRadius: "50%",
                background: "#2b8a3e",
                color: "white",
                display: "grid",
                placeItems: "center",
                margin: "0 auto 14px",
              }}
            >
              <Icon name="check" size={22} />
            </div>
            <h3 style={{ fontSize: "18px", fontWeight: 700, margin: "0 0 8px" }}>
              Password Reset Complete!
            </h3>
            <p style={{ color: "var(--muted)", fontSize: "13px", marginBottom: "20px" }}>
              Your password has been successfully updated. You can now sign in with your new credentials.
            </p>
            <button
              type="button"
              className="primary-button"
              onClick={() => navigate("/")}
            >
              Back to Sign in <Icon name="arrow" size={18} />
            </button>
          </div>
        ) : !token ? (
          <div
            style={{
              background: "#fff9db",
              border: "1px solid #ffe066",
              borderRadius: "12px",
              padding: "24px 20px",
              textAlign: "center",
              marginTop: "20px",
            }}
          >
            <p style={{ color: "#d9480f", fontSize: "13px", marginBottom: "16px" }}>
              This password reset link is invalid or has expired. Please request a new link from the sign-in page.
            </p>
            <Link to="/" className="primary-button" style={{ textDecoration: "none" }}>
              Go to Sign in
            </Link>
          </div>
        ) : (
          <form className="login-form" onSubmit={handleSubmit}>
            <label>
              <span>New password</span>
              <div className="input-shell">
                <Icon name="lock" size={18} />
                <input
                  type="password"
                  placeholder="Create a new password (min. 6 chars)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </label>

            <label>
              <span>Confirm new password</span>
              <div className="input-shell">
                <Icon name="lock" size={18} />
                <input
                  type="password"
                  placeholder="Confirm your new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
            </label>

            <button
              className="primary-button"
              type="submit"
              disabled={loading}
              style={{ marginTop: "24px" }}
            >
              {loading ? "Updating password..." : <>Reset password <Icon name="arrow" size={18} /></>}
            </button>

            <p className="signup">
              Remembered your password?{" "}
              <Link to="/" className="text-button" style={{ textDecoration: "none" }}>
                Sign in
              </Link>
            </p>
          </form>
        )}
      </div>
    </main>
  )
}
