import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Landing from "./pages/Landing";
import Onboarding from "./pages/Onboarding";
import CharacterCreator from "./pages/CharacterCreator";
import StarterPicker from "./pages/StarterPicker";
import Hub from "./pages/Hub";
import Battle from "./pages/Battle";
import EggHatch from "./pages/EggHatch";
import Collection from "./pages/Collection";
import Academy from "./pages/Academy";
import Parent from "./pages/Parent";
import AdminDashboard from "./pages/AdminDashboard";
import ContentStudio from "./pages/ContentStudio";
import { RequirePlayer } from "./components/RequirePlayer";

const App: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/onboarding" element={<Onboarding />} />
      <Route path="/character" element={<CharacterCreator />} />
      <Route path="/starter" element={<RequirePlayer><StarterPicker /></RequirePlayer>} />
      <Route path="/hub" element={<RequirePlayer requireStarter><Hub /></RequirePlayer>} />
      <Route path="/battle" element={<RequirePlayer requireStarter><Battle /></RequirePlayer>} />
      <Route path="/egg" element={<RequirePlayer requireStarter><EggHatch /></RequirePlayer>} />
      <Route path="/collection" element={<RequirePlayer requireStarter><Collection /></RequirePlayer>} />
      <Route path="/academy" element={<RequirePlayer requireStarter><Academy /></RequirePlayer>} />
      <Route path="/parent" element={<Parent />} />
      <Route path="/admin" element={<AdminDashboard />} />
      <Route path="/admin/studio" element={<ContentStudio />} />
      <Route path="/admin/approvals" element={<ContentStudio />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;
