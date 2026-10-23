import { useNavigate } from "react-router-dom"
import Icon from "../components/Icon"

export default function LoginPage() {
  const navigate = useNavigate()
  return <main className="login-screen">
    <div className="brand-mark"><Icon name="pin" size={27} /></div>
    <div className="login-copy"><p className="eyebrow">LOCAL, MADE EASY</p><p>Discover independent vendors, save the ones you love, and always know where to find them.</p></div>
    <div className="login-form">
      <label><span>Email address</span><div className="input-shell"><Icon name="mail" size={18} /><input type="email" placeholder="you@example.com" /></div></label>
      <label><span>Password</span><div className="input-shell"><Icon name="lock" size={18} /><input type="password" placeholder="Enter your password" /></div></label>
      <div className="form-helper"><label className="remember"><input type="checkbox" /> <span>Remember me</span></label><button className="text-button">Forgot password?</button></div>
      <button className="primary-button" onClick={() => navigate("/map")}>Sign in <Icon name="arrow" size={18} /></button>
      <p className="signup">New user? <button className="text-button">Create an account</button></p>
    </div>
  </main>
}
