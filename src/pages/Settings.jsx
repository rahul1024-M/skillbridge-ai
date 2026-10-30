
import { useState } from "react";
import {
  Settings as SettingsIcon,
  User,
  Bell,
  Shield,
  Palette,
  Lock,
  Mail,
  Save,
  Camera,
  Globe,
  Smartphone,
  CheckCircle2,
} from "lucide-react";

export default function Settings() {
  const [profile, setProfile] = useState({
    name: "Pavan S V",
    email: "student@example.com",
    phone: "",
    bio: "Engineering student building skills for the future.",
  });

  const [notifications, setNotifications] = useState({
    email: true,
    courses: true,
    internships: true,
    hackathons: false,
    weekly: true,
  });

  const [privacy, setPrivacy] = useState({
    publicProfile: true,
    showSkills: true,
    showProjects: true,
  });

  const [activeTab, setActiveTab] = useState("Profile");
  const [saved, setSaved] = useState(false);

  const tabs = [
    { name: "Profile", icon: User },
    { name: "Notifications", icon: Bell },
    { name: "Privacy", icon: Shield },
    { name: "Appearance", icon: Palette },
  ];

  const updateProfile = (field, value) => {
    setProfile((prev) => ({ ...prev, [field]: value }));
    setSaved(false);
  };

  const toggleNotification = (field) => {
    setNotifications((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
    setSaved(false);
  };

  const togglePrivacy = (field) => {
    setPrivacy((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
    setSaved(false);
  };

  const handleSave = () => {
    // Demo only: settings are stored in page state, not a database.
    setSaved(true);
  };

  const Toggle = ({ checked, onChange }) => (
    <button
      type="button"
      onClick={onChange}
      aria-pressed={checked}
      className={`relative h-6 w-11 rounded-full transition ${
        checked ? "bg-blue-600" : "bg-slate-300"
      }`}
    >
      <span
        className={`absolute top-1 h-4 w-4 rounded-full bg-white transition ${
          checked ? "left-6" : "left-1"
        }`}
      />
    </button>
  );

  const Field = ({ label, value, onChange, placeholder, type = "text" }) => (
    <div>
      <label className="mb-2 block text-sm font-semibold text-slate-700">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      />
    </div>
  );

  const SettingRow = ({ title, description, checked, onChange }) => (
    <div className="flex items-center justify-between gap-4 border-b border-slate-100 py-5 last:border-0">
      <div>
        <p className="font-semibold text-slate-800">{title}</p>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </div>
      <Toggle checked={checked} onChange={onChange} />
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 p-5 md:p-8">
      <div className="mx-auto max-w-7xl space-y-7">

        <div>
          <p className="text-sm font-semibold text-blue-600">
            PERSONALIZE YOUR EXPERIENCE
          </p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">
            Settings
          </h1>
          <p className="mt-2 text-slate-500">
            Manage your account, notifications and privacy preferences.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">

          {/* Settings navigation */}
          <div className="h-fit rounded-2xl border border-slate-200 bg-white p-3">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const selected = activeTab === tab.name;

              return (
                <button
                  key={tab.name}
                  onClick={() => setActiveTab(tab.name)}
                  className={`mb-1 flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition ${
                    selected
                      ? "bg-blue-50 text-blue-700"
                      : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <Icon size={19} />
                  {tab.name}
                </button>
              );
            })}
          </div>

          {/* Settings content */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 lg:col-span-3">

            {activeTab === "Profile" && (
              <div>
                <div className="mb-7">
                  <h2 className="text-xl font-bold text-slate-900">
                    Profile Information
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Update your personal account information.
                  </p>
                </div>

                <div className="mb-8 flex items-center gap-5">
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-blue-100 text-2xl font-bold text-blue-700">
                    PS
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800">
                      Profile Photo
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Image upload will be available in a future update.
                    </p>
                  </div>
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                  <Field
                    label="Full Name"
                    value={profile.name}
                    onChange={(v) => updateProfile("name", v)}
                  />
                  <Field
                    label="Email Address"
                    type="email"
                    value={profile.email}
                    onChange={(v) => updateProfile("email", v)}
                  />
                  <Field
                    label="Phone Number"
                    value={profile.phone}
                    placeholder="Enter phone number"
                    onChange={(v) => updateProfile("phone", v)}
                  />
                </div>

                <div className="mt-5">
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    About Me
                  </label>
                  <textarea
                    rows="4"
                    value={profile.bio}
                    onChange={(e) => updateProfile("bio", e.target.value)}
                    className="w-full rounded-xl border border-slate-200 p-4 text-sm outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            )}

            {activeTab === "Notifications" && (
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Notification Preferences
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Choose which notifications you want to receive.
                </p>

                <div className="mt-5">
                  <SettingRow
                    title="Email Notifications"
                    description="Receive important updates through email."
                    checked={notifications.email}
                    onChange={() => toggleNotification("email")}
                  />
                  <SettingRow
                    title="Course Updates"
                    description="Get updates about your learning courses."
                    checked={notifications.courses}
                    onChange={() => toggleNotification("courses")}
                  />
                  <SettingRow
                    title="Internship Alerts"
                    description="Receive internship opportunity alerts."
                    checked={notifications.internships}
                    onChange={() => toggleNotification("internships")}
                  />
                  <SettingRow
                    title="Hackathon Alerts"
                    description="Get notified about upcoming hackathons."
                    checked={notifications.hackathons}
                    onChange={() => toggleNotification("hackathons")}
                  />
                  <SettingRow
                    title="Weekly Progress Report"
                    description="Receive a summary of your weekly progress."
                    checked={notifications.weekly}
                    onChange={() => toggleNotification("weekly")}
                  />
                </div>
              </div>
            )}

            {activeTab === "Privacy" && (
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Privacy & Security
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Control what other people can see on your profile.
                </p>

                <div className="mt-5">
                  <SettingRow
                    title="Public Profile"
                    description="Allow recruiters to view your public profile."
                    checked={privacy.publicProfile}
                    onChange={() => togglePrivacy("publicProfile")}
                  />
                  <SettingRow
                    title="Show My Skills"
                    description="Display your technical skills publicly."
                    checked={privacy.showSkills}
                    onChange={() => togglePrivacy("showSkills")}
                  />
                  <SettingRow
                    title="Show My Projects"
                    description="Allow others to view your project portfolio."
                    checked={privacy.showProjects}
                    onChange={() => togglePrivacy("showProjects")}
                  />
                </div>

                <div className="mt-6 rounded-xl bg-blue-50 p-4">
                  <div className="flex gap-3">
                    <Lock className="shrink-0 text-blue-600" size={21} />
                    <div>
                      <p className="font-semibold text-blue-900">
                        Your data matters
                      </p>
                      <p className="mt-1 text-sm text-blue-700">
                        These are demo privacy preferences. They will not
                        change actual profile visibility until backend
                        privacy controls are connected.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "Appearance" && (
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Appearance
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Customize how SkillBridge AI looks.
                </p>

                <div className="mt-7">
                  <p className="font-semibold text-slate-800">
                    Theme Preference
                  </p>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <div className="rounded-xl border-2 border-blue-500 p-4">
                      <div className="h-20 rounded-lg bg-slate-100 p-3">
                        <div className="h-3 w-16 rounded bg-blue-600" />
                        <div className="mt-3 h-2 w-full rounded bg-white" />
                        <div className="mt-2 h-2 w-3/4 rounded bg-white" />
                      </div>
                      <p className="mt-3 text-sm font-semibold text-slate-800">
                        Light Mode
                      </p>
                      <p className="text-xs text-blue-600">
                        Current theme
                      </p>
                    </div>

                    <div className="rounded-xl border border-slate-200 p-4 opacity-60">
                      <div className="h-20 rounded-lg bg-slate-900 p-3">
                        <div className="h-3 w-16 rounded bg-indigo-500" />
                        <div className="mt-3 h-2 w-full rounded bg-slate-700" />
                        <div className="mt-2 h-2 w-3/4 rounded bg-slate-700" />
                      </div>
                      <p className="mt-3 text-sm font-semibold text-slate-800">
                        Dark Mode
                      </p>
                      <p className="text-xs text-slate-500">
                        Coming soon
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 pt-6">
              <div>
                {saved && (
                  <p className="flex items-center gap-2 text-sm font-semibold text-emerald-600">
                    <CheckCircle2 size={17} />
                    Demo settings saved in this page.
                  </p>
                )}
              </div>

              <button
                onClick={handleSave}
                className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-100 transition hover:bg-blue-700"
              >
                <Save size={18} />
                Save Changes
              </button>
            </div>

          </div>
        </div>

        <p className="text-center text-xs text-slate-600">
          © 2026 SkillBridge AI. All Rights Reserved.
        </p>
      </div>
    </div>
  );
}
