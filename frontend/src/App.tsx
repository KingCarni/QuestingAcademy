import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Landing from "./pages/Landing";
import Onboarding from "./pages/Onboarding";
import CharacterCreator from "./pages/CharacterCreator";
import StarterPicker from "./pages/StarterPicker";
import Battle from "./pages/Battle";
import EggHatch from "./pages/EggHatch";
import Collection from "./pages/Collection";
import Academy from "./pages/Academy";
import Parent from "./pages/Parent";
import ParentTeacherDashboard from "./pages/ParentTeacherDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import ContentStudio from "./pages/ContentStudio";
import AdventureHub from "./pages/adventure/AdventureHub";
import RealmMap from "./pages/adventure/RealmMap";
import TownHub from "./pages/adventure/TownHub";
import AdventureZone from "./pages/adventure/AdventureZone";
import CompanionsPanel from "./pages/adventure/CompanionsPanel";
import QuestsPreview from "./pages/adventure/QuestsPreview";
import { RequirePlayer } from "./components/RequirePlayer";

const App: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/onboarding" element={<Onboarding />} />
      <Route path="/character" element={<CharacterCreator />} />
      <Route path="/starter" element={<RequirePlayer><StarterPicker /></RequirePlayer>} />

      {/* RPG Adventure shell (replaces legacy /hub landing) */}
      <Route path="/adventure" element={<RequirePlayer requireStarter><AdventureHub /></RequirePlayer>} />
      <Route path="/adventure/realms" element={<RequirePlayer requireStarter><RealmMap /></RequirePlayer>} />
      <Route path="/adventure/town/:realmId" element={<RequirePlayer requireStarter><TownHub /></RequirePlayer>} />
      <Route path="/adventure/zone" element={<RequirePlayer requireStarter><AdventureZone /></RequirePlayer>} />
      <Route path="/adventure/zone/:zoneId" element={<RequirePlayer requireStarter><AdventureZone /></RequirePlayer>} />
      <Route path="/adventure/companions" element={<RequirePlayer requireStarter><CompanionsPanel /></RequirePlayer>} />
      <Route path="/adventure/quests" element={<RequirePlayer requireStarter><QuestsPreview /></RequirePlayer>} />

      {/* Legacy /hub redirects into the new Adventure flow */}
      <Route path="/hub" element={<Navigate to="/adventure" replace />} />

      <Route path="/battle" element={<RequirePlayer requireStarter><Battle /></RequirePlayer>} />
      <Route path="/egg" element={<RequirePlayer requireStarter><EggHatch /></RequirePlayer>} />
      <Route path="/collection" element={<RequirePlayer requireStarter><Collection /></RequirePlayer>} />
      <Route path="/academy" element={<RequirePlayer requireStarter><Academy /></RequirePlayer>} />
      <Route path="/parent" element={<Parent />} />
      <Route path="/dashboard" element={<ParentTeacherDashboard />} />
      <Route path="/admin/dashboard" element={<ParentTeacherDashboard />} />
      <Route path="/admin" element={<AdminDashboard />} />
      <Route path="/admin/studio" element={<ContentStudio />} />
      <Route path="/admin/approvals" element={<ContentStudio />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;
