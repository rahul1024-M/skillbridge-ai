
import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";

import {
  Bell,
  Check,
  CheckCheck,
  Search,
  X,
  ChevronDown,
  Menu,
  UserRound,
  Settings,
  LayoutDashboard,
  LogOut,
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { supabase } from "../services/supabase";
import {
  fetchStudentNotifications,
  markAllStudentNotificationsRead,
  markStudentNotificationRead,
} from "../services/notifications";
import { fetchGlobalSearchIndex } from "../services/globalSearch";
import { searchGlobalEntries } from "../utils/globalSearch";

const STORAGE_KEY = "skillbridge_student_profile";

function getStudentProfile() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    const profile = saved ? JSON.parse(saved) : {};
    return profile && typeof profile === "object" && !Array.isArray(profile)
      ? profile
      : {};
  } catch (error) {
    console.error("Unable to load student profile:", error);
    return {};
  }
}

function getStudentName() {
  const name = getStudentProfile().name;
  return typeof name === "string" && name.trim()
    ? name.trim()
    : "Student User";
}

const NOTIFICATION_CATEGORIES = {
  internship_update: "Internship update",
  application_update: "Application update",
  hackathon_update: "Hackathon update",
  roadmap_milestone: "Learning roadmap",
  proof_of_work_audit: "Proof of Work",
  skill_recommendation: "Skill recommendation",
};

function formatNotificationDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Time unavailable"
    : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export default function Navbar({ isMenuOpen = false, onMenuClick }) {
  const navigate = useNavigate();
  const { isConfigured, user, signOut } = useAuth();

  const [profileOpen, setProfileOpen] = useState(false);
  const [logoutError, setLogoutError] = useState("");
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationsError, setNotificationsError] = useState("");
  const [notificationAction, setNotificationAction] = useState("");
  const [notificationsOwner, setNotificationsOwner] = useState(null);
  const [globalSearch, setGlobalSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchEntries, setSearchEntries] = useState([]);
  const [searchOwner, setSearchOwner] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [activeSearchIndex, setActiveSearchIndex] = useState(-1);
  const [searchRefresh, setSearchRefresh] = useState(0);
  const [studentName, setStudentName] = useState(() =>
    isConfigured
      ? user?.user_metadata?.full_name || user?.email || "Student User"
      : getStudentName()
  );

  const profileRef = useRef(null);
  const notificationRef = useRef(null);
  const searchContainerRef = useRef(null);
  const searchRef = useRef(null);
  const searchIndexRef = useRef(null);
  const searchResults = searchOwner === (user?.id || "public")
    ? searchGlobalEntries(searchEntries, globalSearch)
    : [];
  const visibleUnreadCount = notificationsOwner === user?.id ? unreadCount : 0;
  const visibleNotifications = notificationsOwner === user?.id ? notifications : [];
  const notificationRequestId = useRef(0);
  const currentUserId = useRef(user?.id);
  currentUserId.current = user?.id;
  const refreshNotifications = useCallback(async () => {
    const requestId = ++notificationRequestId.current;
    if (!isConfigured || !user?.id) {
      setNotifications([]);
      setUnreadCount(0);
      setNotificationsOwner(null);
      setNotificationsError("");
      setNotificationsLoading(false);
      return;
    }

    setNotificationsLoading(true);
    setNotificationsError("");
    try {
      const result = await fetchStudentNotifications(user.id);
      if (notificationRequestId.current === requestId && currentUserId.current === user.id) {
        setNotifications(result.notifications);
        setUnreadCount(result.unreadCount);
        setNotificationsOwner(user.id);
      }
    } catch (error) {
      console.error("Unable to load student notifications:", error);
      if (notificationRequestId.current === requestId && currentUserId.current === user.id) {
        setNotificationsError(error.message || "Notifications could not be loaded.");
      }
    } finally {
      if (notificationRequestId.current === requestId) setNotificationsLoading(false);
    }
  }, [isConfigured, user?.id]);

  useEffect(() => {
    setNotificationAction("");
    refreshNotifications();
    const refreshOnProgress = () => refreshNotifications();
    window.addEventListener("studentProgressUpdated", refreshOnProgress);
    window.addEventListener("focus", refreshOnProgress);
    return () => {
      notificationRequestId.current += 1;
      window.removeEventListener("studentProgressUpdated", refreshOnProgress);
      window.removeEventListener("focus", refreshOnProgress);
    };
  }, [refreshNotifications]);

  useEffect(() => {
    const query = globalSearch.trim();
    if (!query) {
      setSearchEntries([]);
      setSearchOwner(null);
      setSearchLoading(false);
      setSearchError("");
      setActiveSearchIndex(-1);
      return undefined;
    }

    let active = true;
    const timer = window.setTimeout(async () => {
      const ownerId = user?.id || "public";
      const cached = searchIndexRef.current;
      if (cached?.ownerId === ownerId && cached.entries) {
        setSearchEntries(cached.entries);
        setSearchOwner(ownerId);
        setSearchError(cached.error);
        setSearchLoading(false);
        return;
      }

      setSearchOpen(true);
      setSearchLoading(true);
      setSearchError("");
      try {
        const request = cached?.ownerId === ownerId && cached.promise
          ? cached.promise
          : fetchGlobalSearchIndex(user);
        searchIndexRef.current = { ownerId, promise: request, entries: null };
        const result = await request;
        if (!active || (user?.id || "public") !== ownerId) return;
        const errorMessage = result.failures.length
          ? "Some data sources are unavailable. Showing results from the data that loaded."
          : "";
        result.failures.forEach((error) => console.error("Global search source unavailable:", error));
        searchIndexRef.current = { ownerId, entries: result.entries, error: errorMessage };
        setSearchEntries(result.entries);
        setSearchOwner(ownerId);
        setSearchError(errorMessage);
      } catch (error) {
        if (!active) return;
        console.error("Unable to load global search content:", error);
        searchIndexRef.current = null;
        setSearchEntries([]);
        setSearchOwner(ownerId);
        setSearchError(error.message || "Search is temporarily unavailable.");
      } finally {
        if (active) setSearchLoading(false);
      }
    }, 220);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [globalSearch, searchRefresh, user]);

  useEffect(() => {
    const refreshIndex = () => {
      searchIndexRef.current = null;
      if (globalSearch.trim()) setSearchRefresh((current) => current + 1);
    };
    window.addEventListener("studentProfileUpdated", refreshIndex);
    window.addEventListener("studentProgressUpdated", refreshIndex);
    window.addEventListener("storage", refreshIndex);
    return () => {
      window.removeEventListener("studentProfileUpdated", refreshIndex);
      window.removeEventListener("studentProgressUpdated", refreshIndex);
      window.removeEventListener("storage", refreshIndex);
    };
  }, [globalSearch]);

  useEffect(() => {
    const updateStudentName = (event) => {
      if (typeof event?.detail?.name === "string" && event.detail.name.trim()) {
        setStudentName(event.detail.name.trim());
        return;
      }

      if (!isConfigured) {
        setStudentName(getStudentName());
      }
    };

    setStudentName(
      isConfigured
        ? user?.user_metadata?.full_name || user?.email || "Student User"
        : getStudentName()
    );
    window.addEventListener("storage", updateStudentName);
    window.addEventListener("studentProfileUpdated", updateStudentName);

    if (isConfigured && user?.id && supabase) {
      supabase
        .from("student_profiles")
        .select("display_name")
        .eq("user_id", user.id)
        .maybeSingle()
        .then(({ data, error }) => {
          if (error) throw error;
          if (data?.display_name?.trim()) setStudentName(data.display_name.trim());
        })
        .catch((error) => {
          console.error("Unable to load saved student name:", error);
        });
    }

    return () => {
      window.removeEventListener("storage", updateStudentName);
      window.removeEventListener("studentProfileUpdated", updateStudentName);
    };
  }, [isConfigured, user]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleOutsideClick(event) {
      if (
        profileRef.current &&
        !profileRef.current.contains(event.target)
      ) {
        setProfileOpen(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setNotificationsOpen(false);
      }
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
        setSearchOpen(false);
      }
    }

    function handleEscape(event) {
      if (event.key === "Escape") {
        setProfileOpen(false);
        setNotificationsOpen(false);
        setSearchOpen(false);
        setGlobalSearch("");
        searchRef.current?.blur();
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLocaleLowerCase() === "k") {
        event.preventDefault();
        searchRef.current?.focus();
        setSearchOpen(true);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const initials = studentName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();

  const openPage = (path) => {
    setProfileOpen(false);
    setNotificationsOpen(false);
    navigate(path);
  };

  const chooseSearchResult = (result) => {
    setSearchOpen(false);
    setNotificationsOpen(false);
    if (result.externalUrl) {
      window.open(result.externalUrl, "_blank", "noopener,noreferrer");
      return;
    }
    navigate(result.path);
  };

  const handleGlobalSearchKeyDown = (event) => {
    if (event.key === "ArrowDown" && searchResults.length) {
      event.preventDefault();
      setSearchOpen(true);
      setActiveSearchIndex((current) => (current + 1) % searchResults.length);
    } else if (event.key === "ArrowUp" && searchResults.length) {
      event.preventDefault();
      setSearchOpen(true);
      setActiveSearchIndex((current) => current <= 0 ? searchResults.length - 1 : current - 1);
    } else if (event.key === "Enter" && searchResults.length) {
      event.preventDefault();
      chooseSearchResult(searchResults[activeSearchIndex >= 0 ? activeSearchIndex : 0]);
    } else if (event.key === "Escape") {
      setSearchOpen(false);
      setGlobalSearch("");
    }
  };

  const toggleNotifications = () => {
    const opening = !notificationsOpen;
    setNotificationsOpen(opening);
    if (opening) refreshNotifications();
  };

  const markRead = async (notificationId) => {
    setNotificationAction(notificationId);
    setNotificationsError("");
    try {
      const updated = await markStudentNotificationRead(user.id, notificationId);
      if (currentUserId.current !== user.id) return;
      if (updated) {
        setNotifications((current) => current.map((notification) =>
          notification.id === notificationId
            ? { ...notification, read_at: updated.read_at }
            : notification
        ));
        setUnreadCount((current) => Math.max(0, current - 1));
      } else {
        await refreshNotifications();
      }
    } catch (error) {
      console.error("Unable to mark notification as read:", error);
      if (currentUserId.current === user.id) setNotificationsError(error.message || "This notification could not be marked as read.");
    } finally {
      if (currentUserId.current === user.id) setNotificationAction("");
    }
  };

  const markAllRead = async () => {
    setNotificationAction("all");
    setNotificationsError("");
    try {
      await markAllStudentNotificationsRead(user.id);
      if (currentUserId.current !== user.id) return;
      const readAt = new Date().toISOString();
      setNotifications((current) => current.map((notification) =>
        notification.read_at ? notification : { ...notification, read_at: readAt }
      ));
      setUnreadCount(0);
    } catch (error) {
      console.error("Unable to mark all notifications as read:", error);
      if (currentUserId.current === user.id) setNotificationsError(error.message || "Notifications could not be marked as read.");
    } finally {
      if (currentUserId.current === user.id) setNotificationAction("");
    }
  };

  const handleSignOut = async () => {
    setLogoutError("");
    try {
      await signOut();
      setProfileOpen(false);
      navigate("/login", { replace: true });
    } catch (error) {
      console.error("Unable to sign out:", error);
      setLogoutError("Unable to sign out. Please try again.");
    }
  };

  return (
    <header className="sticky top-0 z-40 flex h-[76px] items-center justify-between border-b border-slate-200 bg-white/95 px-5 backdrop-blur-xl sm:px-8">

      {/* Search */}
      <div className="flex min-w-0 flex-1 items-center gap-4">
        <button
          type="button"
          onClick={onMenuClick}
          className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 lg:hidden"
          aria-label="Open menu"
          aria-expanded={isMenuOpen}
        >
          <Menu size={21} />
        </button>

        <div className="relative block min-w-0 w-full max-w-[420px]" ref={searchContainerRef}>
          <Search
            size={18}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
          />

          <input
            ref={searchRef}
            type="search"
            value={globalSearch}
            onFocus={() => {
              setSearchOpen(Boolean(globalSearch.trim()));
              searchIndexRef.current = null;
            }}
            onChange={(event) => {
              setGlobalSearch(event.target.value);
              setSearchOpen(Boolean(event.target.value.trim()));
              setActiveSearchIndex(-1);
            }}
            onKeyDown={handleGlobalSearchKeyDown}
            placeholder="Search everything..."
            aria-label="Search skills, projects, opportunities, and more"
            aria-autocomplete="list"
            aria-expanded={searchOpen && Boolean(globalSearch.trim())}
            aria-controls="global-search-results"
            aria-activedescendant={activeSearchIndex >= 0 ? `global-search-result-${activeSearchIndex}` : undefined}
            role="combobox"
            className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-10 text-xs outline-none transition placeholder:text-ellipsis focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50 sm:text-sm"
          />
          {globalSearch && (
            <button type="button" onClick={() => { setGlobalSearch(""); setSearchOpen(false); searchRef.current?.focus(); }} aria-label="Clear global search" className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
              <X size={15} />
            </button>
          )}
          {searchOpen && globalSearch.trim() && (
            <div
              id="global-search-results"
              role="listbox"
              aria-label="Global search results"
              className="fixed left-2 right-2 top-[70px] z-[70] max-h-[min(70vh,560px)] overflow-y-auto rounded-2xl border border-slate-200 bg-white py-2 shadow-2xl shadow-slate-900/20 sm:absolute sm:left-0 sm:right-auto sm:top-full sm:mt-2 sm:w-full"
            >
              {searchLoading ? (
                <p className="px-4 py-6 text-center text-sm text-slate-500">Searching your workspace…</p>
              ) : (
                <>
                  {searchError && <p role="status" className="px-4 py-2 text-xs text-amber-700">{searchError}</p>}
                  {searchResults.length ? searchResults.map((result, index) => (
                    <button
                      type="button"
                      role="option"
                      aria-selected={index === activeSearchIndex}
                      id={`global-search-result-${index}`}
                      key={result.id}
                      onMouseEnter={() => setActiveSearchIndex(index)}
                      onClick={() => chooseSearchResult(result)}
                      className={`block w-full px-4 py-3 text-left transition ${index === activeSearchIndex ? "bg-blue-50" : "hover:bg-slate-50"}`}
                    >
                      <span className="flex items-start justify-between gap-3">
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold text-slate-900">{result.title}</span>
                          <span className="mt-1 line-clamp-2 block text-xs leading-5 text-slate-500">{result.description}</span>
                        </span>
                        <span className="shrink-0 rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-600">{result.category}</span>
                      </span>
                    </button>
                  )) : (
                    <div className="px-4 py-7 text-center">
                      <p className="text-sm font-semibold text-slate-700">No results found</p>
                      <p className="mt-1 text-xs text-slate-500">Try another title, skill, company, or topic.</p>
                    </div>
                  )}
                  {searchResults.length > 0 && <p className="border-t border-slate-100 px-4 pt-2 text-[10px] text-slate-400">Use ↑ ↓ to navigate · Enter to open · Esc to close</p>}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right Actions */}
      <div className="ml-4 flex shrink-0 items-center gap-3 sm:gap-5">

        {/* Notifications */}
        <div className="relative" ref={notificationRef}>
          <button
            type="button"
            onClick={toggleNotifications}
            className="relative rounded-xl p-2.5 text-slate-500 transition hover:bg-slate-100"
            aria-label={visibleUnreadCount ? `Notifications, ${visibleUnreadCount} unread` : "Notifications"}
            aria-expanded={notificationsOpen}
            aria-haspopup="dialog"
          >
            <Bell size={20} />
            {visibleUnreadCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex min-h-4 min-w-4 items-center justify-center rounded-full border-2 border-white bg-red-500 px-0.5 text-[9px] font-bold leading-none text-white">
                {visibleUnreadCount > 99 ? "99+" : visibleUnreadCount}
              </span>
            )}
          </button>
          {notificationsOpen && (
            <section
              role="dialog"
              aria-label="Notifications"
              className="fixed right-2 top-[70px] z-[60] flex max-h-[min(72vh,620px)] w-[calc(100vw-1rem)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/20 sm:absolute sm:right-0 sm:top-full sm:mt-3 sm:w-[420px]"
            >
              <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Notifications</h2>
                  <p className="mt-0.5 text-[11px] text-slate-500">{visibleUnreadCount} unread</p>
                </div>
                <div className="flex items-center gap-2">
                  {visibleUnreadCount > 0 && (
                    <button
                      type="button"
                      onClick={markAllRead}
                      disabled={notificationAction !== ""}
                      className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-50"
                    >
                      <CheckCheck size={14} /> Mark all read
                    </button>
                  )}
                  <button type="button" onClick={() => setNotificationsOpen(false)} aria-label="Close notifications" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700">×</button>
                </div>
              </div>
              {notificationsError && <p role="alert" className="border-b border-red-100 bg-red-50 px-4 py-2 text-xs text-red-700">{notificationsError}</p>}
              <div className="overflow-y-auto">
                {notificationsLoading ? (
                  <p className="p-8 text-center text-sm text-slate-500">Loading notifications…</p>
                ) : !isConfigured || !user ? (
                  <p className="p-8 text-center text-sm text-slate-500">Sign in to view your notifications.</p>
                ) : visibleNotifications.length === 0 && !notificationsError ? (
                  <div className="p-8 text-center">
                    <Bell size={22} className="mx-auto text-slate-300" />
                    <p className="mt-3 text-sm font-semibold text-slate-700">You’re all caught up</p>
                    <p className="mt-1 text-xs text-slate-500">Updates from your account activity will appear here.</p>
                  </div>
                ) : visibleNotifications.length > 0 ? (
                  <ul className="divide-y divide-slate-100">
                    {visibleNotifications.map((notification) => (
                      <li key={notification.id} className={`px-4 py-3 ${notification.read_at ? "bg-white" : "bg-blue-50/60"}`}>
                        <div className="flex items-start gap-3">
                          <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${notification.read_at ? "bg-slate-200" : "bg-blue-600"}`} />
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span className="text-[10px] font-bold uppercase tracking-wide text-blue-700">{NOTIFICATION_CATEGORIES[notification.category] || "Account update"}</span>
                              {!notification.read_at && (
                                <button
                                  type="button"
                                  onClick={() => markRead(notification.id)}
                                  disabled={notificationAction !== ""}
                                  aria-label={`Mark ${notification.title} as read`}
                                  className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-500 hover:text-blue-700 disabled:opacity-50"
                                >
                                  <Check size={12} /> Mark read
                                </button>
                              )}
                            </div>
                            <h3 className="mt-1 text-sm font-semibold text-slate-900">{notification.title}</h3>
                            <p className="mt-1 whitespace-pre-wrap break-words text-xs leading-5 text-slate-600">{notification.message}</p>
                            <time dateTime={notification.created_at} className="mt-2 block text-[10px] text-slate-400">{formatNotificationDate(notification.created_at)}</time>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </section>
          )}
        </div>

        <div className="h-8 w-px bg-slate-200" />

        {/* Student Account */}
        <div className="relative" ref={profileRef}>
          <button
            type="button"
            onClick={() => setProfileOpen((previous) => !previous)}
            aria-expanded={profileOpen}
            aria-haspopup="menu"
            className="flex items-center gap-2 rounded-xl p-1.5 transition hover:bg-slate-50"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-violet-600 text-sm font-bold text-white">
              {initials || "S"}
            </div>

            <div className="hidden text-left sm:block">
              <p className="max-w-[130px] truncate text-xs font-semibold text-slate-800">
                {studentName}
              </p>
              <p className="text-[10px] text-slate-500">
                Student Account
              </p>
            </div>

            <ChevronDown
              size={15}
              className={`hidden text-slate-400 transition-transform sm:block ${
                profileOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {/* Account Dropdown */}
          {profileOpen && (
            <div
              role="menu"
              className="absolute right-0 top-full mt-3 w-64 overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-xl shadow-slate-900/10"
            >
              <div className="border-b border-slate-100 px-3 py-3">
                <p className="text-sm font-bold text-slate-800">
                  {studentName}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Student Account
                </p>
              </div>

              <button
                type="button"
                role="menuitem"
                onClick={() => openPage("/profile")}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium text-slate-700 transition hover:bg-blue-50 hover:text-blue-700"
              >
                <UserRound size={17} />
                My Profile
              </button>

              <button
                type="button"
                role="menuitem"
                onClick={() => openPage("/settings")}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium text-slate-700 transition hover:bg-blue-50 hover:text-blue-700"
              >
                <Settings size={17} />
                Settings
              </button>

              {isConfigured && user && (
                <button
                  type="button"
                  role="menuitem"
                  onClick={handleSignOut}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium text-slate-500 transition hover:bg-red-50 hover:text-red-700"
                >
                  <LogOut size={17} />
                  Sign out
                </button>
              )}

              {logoutError && (
                <p role="alert" className="px-3 py-2 text-xs text-red-600">
                  {logoutError}
                </p>
              )}

              <div className="my-1 border-t border-slate-100" />

              <button
                type="button"
                role="menuitem"
                onClick={() => openPage("/")}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium text-slate-500 transition hover:bg-slate-50"
              >
                <LayoutDashboard size={17} />
                Back to Dashboard
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
