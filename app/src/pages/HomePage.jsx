import { useAuth } from "../hooks/useAuth"
import LoginPage from "./LoginPage"
import MapPage from "./MapPage"

export default function HomePage() {
  const { isAuthenticated } = useAuth()

  if (!isAuthenticated) {
    return <LoginPage />
  }

  return <MapPage />
}
