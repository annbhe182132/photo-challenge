import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import HomePage from '../pages/Home/HomePage'
import LobbyPage from '../pages/Lobby/LobbyPage'
import ChallengePage from '../pages/Challenge/ChallengePage'
import ResultPage from '../pages/Result/ResultPage'
import LeaderboardPage from '../pages/Leaderboard/LeaderboardPage'
import ScanQRPage from "../pages/ScanQR/ScanQRPage";
import CameraPage from '../pages/Camera/CameraPage';
import AIVerifyPage from '../pages/AIVerify/AIVerifyPage';
import GalleryPage from "../pages/Gallery/GalleryPage";
import AdminPage from '../pages/Admin/AdminPage';

const AppRouter = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/lobby" element={<LobbyPage />} />
        <Route path="/challenge" element={<ChallengePage />} />
        <Route path="/result" element={<ResultPage />} />
        <Route path="/leaderboard" element={<LeaderboardPage />} />
        <Route path="/scan" element={<ScanQRPage />} />
        <Route path="/camera" element={<CameraPage />} />
        <Route path="/verify" element={<AIVerifyPage />} />
        <Route path="/gallery" element={<GalleryPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default AppRouter
