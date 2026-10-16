import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getUserFriends, getFriendRequests } from "../lib/api";
import { Link } from "react-router";
import {
  UsersIcon,
  SearchIcon,
  BellIcon,
  SparklesIcon,
  UserPlusIcon,
  XIcon,
} from "lucide-react";
import FriendCard from "../components/FriendCard";

const FriendsPage = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [languageFilter, setLanguageFilter] = useState("all");

  const { data: friends = [], isLoading: loadingFriends } = useQuery({
    queryKey: ["friends"],
    queryFn: getUserFriends,
  });

  const { data: friendRequests } = useQuery({
    queryKey: ["friendRequests"],
    queryFn: getFriendRequests,
  });

  const incomingRequestsCount = friendRequests?.incomingReqs?.length || 0;

  // Extract unique languages among friends
  const availableLanguages = useMemo(() => {
    const langs = new Set();
    friends.forEach((f) => {
      if (f.nativeLanguage) langs.add(f.nativeLanguage.toLowerCase());
      if (f.learningLanguage) langs.add(f.learningLanguage.toLowerCase());
    });
    return Array.from(langs).sort();
  }, [friends]);

  // Filter friends by query and language
  const filteredFriends = useMemo(() => {
    return friends.filter((friend) => {
      const matchesSearch =
        searchQuery.trim() === "" ||
        friend.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        friend.nativeLanguage?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        friend.learningLanguage?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        friend.location?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesLang =
        languageFilter === "all" ||
        friend.nativeLanguage?.toLowerCase() === languageFilter ||
        friend.learningLanguage?.toLowerCase() === languageFilter;

      return matchesSearch && matchesLang;
    });
  }, [friends, searchQuery, languageFilter]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 min-h-screen bg-base-100 text-base-content">
      <div className="container mx-auto space-y-8 max-w-7xl">
        {/* HEADER SECTION */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-base-300">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-primary/10 text-primary">
                <UsersIcon className="size-7" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                  Your Friends
                </h1>
                <p className="text-sm opacity-70 mt-0.5">
                  Connect, practice and message your language partners
                </p>
              </div>
              <span className="badge badge-primary badge-lg font-bold ml-2">
                {friends.length}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <Link to="/notifications" className="btn btn-outline btn-sm gap-2 relative">
              <BellIcon className="size-4" />
              Friend Requests
              {incomingRequestsCount > 0 && (
                <span className="badge badge-error badge-xs font-semibold">
                  {incomingRequestsCount}
                </span>
              )}
            </Link>

            <Link to="/" className="btn btn-primary btn-sm gap-2">
              <UserPlusIcon className="size-4" />
              Find Learners
            </Link>
          </div>
        </div>

        {/* CONTROLS (SEARCH & FILTER) */}
        {friends.length > 0 && (
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            {/* SEARCH */}
            <div className="relative flex-1 max-w-md">
              <SearchIcon className="size-4 absolute left-3.5 top-1/2 -translate-y-1/2 opacity-50" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search friends by name, language, or location..."
                className="input input-bordered input-sm w-full pl-10 pr-9 bg-base-200/60 focus:bg-base-100"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 opacity-60 hover:opacity-100"
                >
                  <XIcon className="size-4" />
                </button>
              )}
            </div>

            {/* LANGUAGE FILTER */}
            {availableLanguages.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold opacity-60 uppercase tracking-wider">
                  Language:
                </span>
                <select
                  value={languageFilter}
                  onChange={(e) => setLanguageFilter(e.target.value)}
                  className="select select-bordered select-sm bg-base-200/60"
                >
                  <option value="all">All Languages</option>
                  {availableLanguages.map((lang) => (
                    <option key={lang} value={lang}>
                      {lang.charAt(0).toUpperCase() + lang.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}

        {/* CONTENT */}
        {loadingFriends ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <span className="loading loading-spinner loading-lg text-primary" />
            <p className="text-sm opacity-60">Loading your friends...</p>
          </div>
        ) : friends.length === 0 ? (
          /* NO FRIENDS YET EMPTY STATE */
          <div className="card bg-base-200/70 border border-base-300 p-8 sm:p-12 text-center max-w-2xl mx-auto shadow-sm">
            <div className="size-20 mx-auto rounded-3xl bg-primary/10 flex items-center justify-center mb-5 text-primary">
              <UsersIcon className="size-10" />
            </div>
            <h3 className="text-xl sm:text-2xl font-bold mb-2">No friends yet</h3>
            <p className="text-base-content/70 max-w-md mx-auto mb-6">
              Connect with fellow language learners to practice speaking, send messages, and make video calls!
            </p>
            <div className="flex justify-center gap-3">
              <Link to="/" className="btn btn-primary gap-2">
                <SparklesIcon className="size-4" />
                Discover Language Partners
              </Link>
            </div>
          </div>
        ) : filteredFriends.length === 0 ? (
          /* FILTER MATCH NONE */
          <div className="card bg-base-200/60 border border-base-300 p-8 text-center max-w-lg mx-auto">
            <p className="font-semibold text-lg mb-1">No matching friends found</p>
            <p className="text-sm opacity-70 mb-4">
              We couldn't find anyone matching your current filters.
            </p>
            <button
              onClick={() => {
                setSearchQuery("");
                setLanguageFilter("all");
              }}
              className="btn btn-outline btn-sm mx-auto"
            >
              Clear filters
            </button>
          </div>
        ) : (
          /* FRIENDS GRID */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredFriends.map((friend) => (
              <FriendCard key={friend._id} friend={friend} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default FriendsPage;
