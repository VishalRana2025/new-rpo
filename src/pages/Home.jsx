import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import ActivityChart from "../components/ActivityChart";
import ActivityPopup from "../components/ActivityPopup";

const Home = () => {
  const navigate = useNavigate();

  // DEFAULT CHART DATA (7 days placeholder)
  const defaultChartData = Array.from({ length: 7 }, (_, i) => ({
    date: new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000).toLocaleDateString(),
    create: 0,
    update: 0,
    createDetails: [],
    updateDetails: []
  }));

  // States with DEFAULT values (so UI shows immediately)
  const [createdData, setCreatedData] = useState(defaultChartData);
  const [updatedData, setUpdatedData] = useState(defaultChartData);
  const [recentActivities, setRecentActivities] = useState([]);
  const [summaryStats, setSummaryStats] = useState({
    total: { create: 0, update: 0, delete: 0 },
    candidate: { create: 0, update: 0, delete: 0 },
    requirement: { create: 0, update: 0, delete: 0 },
  });
  const [loading, setLoading] = useState(false);
  const [filterDays, setFilterDays] = useState(7);
  const [allClients, setAllClients] = useState([]);
  const [openClientData, setOpenClientData] = useState([]);
  const [closedClientData, setClosedClientData] = useState([]);
  const [joinedCandidates, setJoinedCandidates] = useState([]);
  const [designationData, setDesignationData] = useState([]);
  const [remainingCandidates, setRemainingCandidates] = useState(0);
  const [noClientCandidates, setNoClientCandidates] = useState([]);
  const [totalCandidates, setTotalCandidates] = useState(0);
  const [updatedCandidates, setUpdatedCandidates] = useState(0);
  const [joinedCount, setJoinedCount] = useState(0);
  // Popup state
  const [popupOpen, setPopupOpen] = useState(false);
  const [popupData, setPopupData] = useState(null);

  // GROUPING FUNCTION - Groups activities by recruiter/userName
  const groupByUser = (activities) => {
    const map = {};

    activities.forEach((act) => {
      const user = act.userName || "Unknown";
      if (user === "System") return;

      if (!map[user]) {
        map[user] = {
          count: 0,
          candidates: []
        };
      }

      map[user].count++;
      map[user].candidates.push({
        candidateName: act.itemName || "Unknown Candidate",
        action: act.action,
        date: act.createdAt
      });
    });

    return Object.keys(map)
      .map((user) => ({
        user,
        count: map[user].count,
        candidates: map[user].candidates
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);
  };

  // Format chart data with createDetails and updateDetails
  const formatChartData = (data, activities) => {
    if (!data || Object.keys(data).length === 0) return defaultChartData;
// Generate last X days including today
const allDates = [];

for (let i = filterDays - 1; i >= 0; i--) {
  const d = new Date();
  d.setDate(d.getDate() - i);

 const day = String(d.getDate()).padStart(2, "0");
const month = String(d.getMonth() + 1).padStart(2, "0");
const year = d.getFullYear();

const formattedDate = `${day}/${month}/${year}`;

  allDates.push(formattedDate);
}

const formatted = allDates.map((date) => {
  const d = data[date] || {};

  const dateParts = date.split("/");
  const dateObj = new Date(
    `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`
  );
const year = dateParts[2];
const month = dateParts[1];
const day = dateParts[0];

const dateStr = `${year}-${month}-${day}`;

  const dateActivities = (activities || []).filter((act) => {
    let actDate = "";

    if (act.action === "CREATE") {
      actDate = new Date(act.createdAt)
        .toISOString()
        .split("T")[0];
    } else if (act.action === "UPDATE") {
      actDate = new Date(
        act.updatedAt || act.createdAt
      )
        .toISOString()
        .split("T")[0];
    }

    return (
      actDate === dateStr &&
      act.module === "candidate"
    );
  });

  const createActivities = dateActivities
    .filter((act) => act.action === "CREATE")
    .filter(
      (act, index, self) =>
        index === self.findIndex((a) => a._id === act._id)
    );

  const updateActivities = dateActivities
    .filter((act) => act.action === "UPDATE")
    .filter(
      (act, index, self) =>
        index === self.findIndex((a) => a._id === act._id)
    );

  return {
    date,
    create: createActivities.length,
    update: updateActivities.length,
    createDetails: groupByUser(createActivities),
    updateDetails: groupByUser(updateActivities),
  };
});

return formatted;
  };

  // LOAD FROM CACHE INSTANTLY
  const loadFromCache = () => {
    try {
      const stored = localStorage.getItem("dashboardCache");
      if (stored) {
        const parsed = JSON.parse(stored);

        setCreatedData(parsed.createdData || defaultChartData);
        setUpdatedData(parsed.updatedData || defaultChartData);
        setRecentActivities(parsed.recentActivities || []);
        setSummaryStats(parsed.summaryStats || {
          total: { create: 0, update: 0, delete: 0 },
          candidate: { create: 0, update: 0, delete: 0 },
          requirement: { create: 0, update: 0, delete: 0 },
        });
        setAllClients(parsed.allClients || []);
        setOpenClientData(parsed.openClientData || []);
        setClosedClientData(parsed.closedClientData || []);
        setJoinedCandidates(parsed.joinedCandidates || []);
        return true;
      }
    } catch (err) {
      console.error("Error loading from cache:", err);
    }
    return false;
  };

  // LOAD FRESH DATA (Background update - doesn't block UI)
  const loadDashboardData = async () => {
    try {
      const [
        candidateRes,
        activitiesRes,
        summaryRes,
        clientsRes,
        candidatesRes
      ] = await Promise.all([
        api.get(`/activity-stats?days=${filterDays}&module=candidate`),
        api.get("/recent-activities?limit=1000"),
        api.get("/activity-summary"),
        api.get("/clients"),
        api.get("/candidates")
      ]);

      const allCandidates = candidatesRes.data || [];
      const candidates = allCandidates;
      const totalCount = candidates.length;

      const updatedCount = candidates.filter(
        (c) => c.updatedAt && c.createdAt !== c.updatedAt
      ).length;

      const joinedCountValue = candidates.filter((c) =>
        c.clientSections?.some(
          (s) =>
            s.clientStatus &&
            s.clientStatus.toLowerCase() === "joined"
        )
      ).length;

      setTotalCandidates(totalCount);
      setUpdatedCandidates(updatedCount);
      setJoinedCount(joinedCountValue);

      const designationMap = {};

      candidates.forEach((candidate) => {
        const lastSection = candidate.clientSections?.length
          ? candidate.clientSections[candidate.clientSections.length - 1]
          : null;
        const designation =
          lastSection?.designation?.trim() ||
          candidate.designation?.trim() ||
          "No Designation";

        if (!designationMap[designation]) {
          designationMap[designation] = {
            count: 0,
            candidates: []
          };
        }

        designationMap[designation].count++;
        designationMap[designation].candidates.push({
          name: `${candidate.firstName || ""} ${candidate.lastName || ""}`,
          clientName: lastSection?.clientName || "Unknown Client",
          status: candidate.status || "N/A"
        });
      });

      const formattedDesignationData = Object.keys(designationMap)
        .map((designation) => ({
          designation,
          count: designationMap[designation].count,
          candidates: designationMap[designation].candidates
        }))
        .sort((a, b) => b.count - a.count);

      setDesignationData(formattedDesignationData);

      const activities = activitiesRes.data || [];

      let candidateFormatted = formatChartData(candidateRes.data, activities);
      candidateFormatted = candidateFormatted.slice(0, 90);

      const createdOnly = candidateFormatted.map(item => ({
        ...item,
        update: 0,
      }));

      const updatedOnly = candidateFormatted.map(item => ({
        ...item,
        create: 0,
      }));

      setCreatedData(createdOnly);
      setUpdatedData(updatedOnly);
      setRecentActivities(activities.slice(0, 15));

      const summaryData = summaryRes.data || {
        total: { create: 0, update: 0, delete: 0 },
        candidate: { create: 0, update: 0, delete: 0 },
        requirement: { create: 0, update: 0, delete: 0 },
      };
      setSummaryStats(summaryData);

      const clientsList = clientsRes.data || [];
      const clientNameMap = {};
      clientsList.forEach(c => {
        if (c.clientName) {
          clientNameMap[c.clientName.toLowerCase().trim()] = c.clientName;
        }
      });

      const clientCountMap = {};
      for (const c of candidates) {
        let lastClient = null;
        if (Array.isArray(c.clientSections) && c.clientSections.length > 0) {
          for (let i = c.clientSections.length - 1; i >= 0; i--) {
            const section = c.clientSections[i];
            if (
              section.clientName &&
              section.clientName.trim() !== "" &&
              section.clientStatus?.toString().trim().toLowerCase() !== "rejected- client"
            ) {
              lastClient = section.clientName.trim();
              break;
            }
          }
        }
        if (!lastClient) continue;
        const clientName = clientNameMap[lastClient.toLowerCase()] || lastClient;
        clientCountMap[clientName] = (clientCountMap[clientName] || 0) + 1;
      }

      const sortedClients = clientsList
        .filter(c => c.clientName && c.clientName.trim() !== "")
        .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
        .slice(0, 100);

      const chartClients = sortedClients.map(c => ({
        name: c.clientName.trim(),
        value: clientCountMap[c.clientName.trim()] || 0
      }));

      setAllClients(chartClients);

      const totalCandidatesCount = candidates.length;
      let assignedCandidates = 0;
      const noClientList = [];

      candidates.forEach((candidate) => {
        const lastSection =
          candidate.clientSections?.length
            ? candidate.clientSections[
              candidate.clientSections.length - 1
            ]
            : null;

        const hasClient =
          lastSection?.clientName &&
          lastSection.clientName.trim() !== "";

        if (hasClient) {
          assignedCandidates++;
        } else {
          noClientList.push({
            candidateName:
              `${candidate.firstName || ""} ${candidate.lastName || ""}`.trim(),
            designation:
              candidate.designation || "No Designation",
            status:
              candidate.status || "N/A"
          });
        }
      });
      const remainingCandidatesCount = totalCandidatesCount - assignedCandidates;

      setRemainingCandidates(remainingCandidatesCount);
      setNoClientCandidates(noClientList);

      const clientMap = {};
      for (const c of candidates) {
        let lastClient = null;
        if (Array.isArray(c.clientSections) && c.clientSections.length > 0) {
          for (let i = c.clientSections.length - 1; i >= 0; i--) {
            const section = c.clientSections[i];
            if (
              section.clientName &&
              section.clientName.trim() !== "" &&
              section.clientStatus?.toLowerCase() !== "rejected- client"
            ) {
              lastClient = section.clientName.trim();
              break;
            }
          }
        }
        if (!lastClient) continue;
        const clientName = clientNameMap[lastClient.toLowerCase()] || lastClient;
        clientMap[clientName] = (clientMap[clientName] || 0) + 1;
      }

      const formattedClients = Object.keys(clientMap).map(name => ({
        clientName: name,
        count: clientMap[name]
      })).sort((a, b) => b.count - a.count).slice(0, 50);

      setOpenClientData(formattedClients);

      const closedMap = {};
      const joinedList = [];

      for (const c of candidates) {
        if (!Array.isArray(c.clientSections)) continue;

        c.clientSections.forEach((section) => {
          const clientName = section.clientName?.trim();
          const status = section.clientStatus
            ?.toString()
            .trim()
            .toLowerCase();

          if (
            clientName &&
            status &&
            status === "joined"
          ) {
            const finalClientName =
              clientNameMap[clientName.toLowerCase()] || clientName;

            closedMap[finalClientName] =
              (closedMap[finalClientName] || 0) + 1;

            joinedList.push({
              candidateName:
                `${c.firstName || ""} ${c.lastName || ""}`.trim(),
              clientName: finalClientName,
              designation:
                section.designation ||
                c.designation ||
                "No Designation",
              status: section.clientStatus || "Joined",
              joinedDate: section.joinedDate || ""
            });
          }
        });
      }

      const closedClients = Object.keys(closedMap).map(name => ({
        clientName: name,
        count: closedMap[name]
      })).sort((a, b) => b.count - a.count).slice(0, 50);

      setClosedClientData(closedClients);
      setJoinedCandidates(joinedList);

      const cacheData = {
        createdData: createdOnly,
        updatedData: updatedOnly,
        joinedCandidates: joinedList,
        recentActivities: activities.slice(0, 15),
        summaryStats: summaryData,
        allClients: chartClients,
        openClientData: formattedClients,
        closedClientData: closedClients,
        filterDays: filterDays,
        timestamp: Date.now()
      };

      localStorage.setItem("dashboardCache", JSON.stringify(cacheData));

    } catch (err) {
      console.error("Error loading dashboard data:", err);
    } finally {
      setLoading(false);
    }
  };

  // OPTIMIZED useEffect - Loads cache instantly, then updates in background
  useEffect(() => {
    loadFromCache();
    loadDashboardData();

    const intervalId = setInterval(() => {
      loadDashboardData();
    }, 30000);

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [filterDays]);

  const handleBarClick = (data) => {
    if (!data) return;

    setPopupData({
      actionType: data.actionType,
      details: data.details || [],
      date: data.date,
      count: data.count || 0
    });
    setPopupOpen(true);
  };

  const handleClientBarClick = (data) => {
    if (!data || !data.date) return;
    navigate(`/clients?name=${encodeURIComponent(data.date)}`);
  };

  const handleNoClientClick = () => {
    setPopupData({
      actionType: "No Clients",
      details: noClientCandidates,
      count: noClientCandidates.length,
      date: "No Clients",
      type: "no-client"
    });
    setPopupOpen(true);
  };

  const handleDesignationClick = (item) => {
    setPopupData({
      actionType: item.designation,
      details: item.candidates,
      count: item.count,
      date: item.designation,
      type: "designation"
    });
    setPopupOpen(true);
  };

  const closePopup = () => {
    setPopupOpen(false);
    setPopupData(null);
  };

  const handleRefresh = () => {
    localStorage.removeItem("dashboardCache");
    loadDashboardData();
  };

  const handleClearCache = () => {
    if (window.confirm("Clear dashboard cache? Data will reload from server.")) {
      localStorage.removeItem("dashboardCache");
      loadDashboardData();
    }
  };

  const getCacheAge = () => {
    try {
      const stored = localStorage.getItem("dashboardCache");
      if (stored) {
        const parsed = JSON.parse(stored);
        const ageSeconds = Math.round((Date.now() - parsed.timestamp) / 1000);
        if (ageSeconds < 60) return `${ageSeconds} seconds`;
        if (ageSeconds < 3600) return `${Math.round(ageSeconds / 60)} minutes`;
        return `${Math.round(ageSeconds / 3600)} hours`;
      }
    } catch (e) {
      return "unknown";
    }
    return null;
  };

  return (
    <main className="min-h-screen overflow-x-hidden bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="w-full max-w-full mx-auto px-2 sm:px-4 lg:px-6 overflow-x-hidden">

        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white tracking-tight">Candidate Dashboard</h1>
              <p className="text-gray-400 mt-2">Real-time activity monitoring & analytics</p>
            </div>
          </div>
          {/* Cache status indicator */}
          {localStorage.getItem("dashboardCache") && (() => {
            const stored = localStorage.getItem("dashboardCache");
            const parsed = JSON.parse(stored);
            return (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="text-xs px-2 py-1 rounded-full text-green-400 bg-green-500/10 whitespace-nowrap">
                  ⚡ Fast loading from cache
                </span>
                <span className="text-xs text-gray-500 break-words">
                  • Updated {getCacheAge()} ago • Auto-refreshes every 30s
                </span>
              </div>
            );
          })()}
        </div>

        {/* TOP CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700 hover:border-gray-600 transition-all group">
            <div className="flex items-center justify-between mb-3">
              <p className="text-gray-400 text-sm font-medium">Total Candidates</p>
              <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center group-hover:bg-blue-500/20 transition-all">
                <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
            </div>
            <h2 className="text-3xl font-bold text-white">
              {totalCandidates}
            </h2>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700 hover:border-gray-600 transition-all group">
            <div className="flex items-center justify-between mb-3">
              <p className="text-gray-400 text-sm font-medium">Created</p>
              <div className="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center group-hover:bg-green-500/20 transition-all">
                <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
            </div>
            <h2 className="text-3xl font-bold text-green-400">{totalCandidates}</h2>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700 hover:border-gray-600 transition-all group">
            <div className="flex items-center justify-between mb-3">
              <p className="text-gray-400 text-sm font-medium">Updated</p>
              <div className="w-10 h-10 bg-yellow-500/10 rounded-lg flex items-center justify-center group-hover:bg-yellow-500/20 transition-all">
                <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </div>
            </div>
            <h2 className="text-3xl font-bold text-yellow-400">{updatedCandidates}</h2>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 mb-8 border border-gray-700">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <label htmlFor="timeRange" className="text-sm text-gray-300">
                Time Range:
              </label>
              <select
                id="timeRange"
                value={filterDays}
                onChange={(e) => setFilterDays(parseInt(e.target.value))}
                className="bg-gray-900 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
              >
                <option value="1">Last 1 day</option>
                <option value="7">Last 7 days</option>
                <option value="15">Last 15 days</option>
                <option value="30">Last 30 days</option>
                <option value="60">Last 60 days</option>
                <option value="90">Last 90 days</option>
              </select>
            </div>

            <button
              onClick={handleRefresh}
              className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg text-sm transition-all flex items-center gap-2 ml-auto"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
          </div>
        </div>

        {/* ACTIVITY OVERVIEW */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 lg:gap-6 mb-6">
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold text-lg">🟢 Created Candidates</h3>
              <span className="text-xs text-gray-500">Last {filterDays} days</span>
            </div>
            <div className="h-[300px] sm:h-[350px] lg:h-[380px] bg-gray-900/50 rounded-lg overflow-x-auto overflow-y-hidden">
              <ActivityChart data={createdData} onBarClick={handleBarClick} />
            </div>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold text-lg">🟡 Updated Candidates</h3>
              <span className="text-xs text-gray-500">Last {filterDays} days</span>
            </div>
            <div className="h-[300px] sm:h-[350px] lg:h-[380px] bg-gray-900/50 rounded-lg overflow-x-auto overflow-y-hidden">
              <ActivityChart data={updatedData} onBarClick={handleBarClick} />
            </div>
          </div>
        </div>

        {/* CLIENTS DISTRIBUTION CHART */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700 mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-4">
            <h2 className="text-xl font-bold text-white">
              🏢 Open Candidates On Clients
            </h2>
            <div className="flex items-center gap-3 flex-wrap">
              <div
                onClick={handleNoClientClick}
                className="text-sm font-semibold text-red-300 bg-red-500/10 border border-red-500/20 px-5 py-2 rounded-xl cursor-pointer hover:bg-red-500/20 transition-all whitespace-nowrap"
              >
                No Clients: {remainingCandidates}
              </div>
              <div className="text-sm text-blue-400 bg-blue-500/10 px-3 py-1 rounded-full whitespace-nowrap">
                Total Clients: {allClients.length}
              </div>
            </div>
          </div>

          {allClients.length === 0 ? (
            <div className="text-center py-8 text-gray-400">No client data available</div>
          ) : (
            <div className="h-[450px] lg:h-[400px] bg-gray-900/50 rounded-lg p-2 sm:p-4 overflow-x-auto overflow-y-hidden">
              <ActivityChart
                data={allClients.map(c => ({
                  date: c.name,
                  create: c.value,
                  update: 0,
                  createDetails: [],
                  updateDetails: []
                }))}
                onBarClick={handleClientBarClick}
              />
            </div>
          )}
        </div>

        {/* DESIGNATION SECTION */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700 mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-4">
            <h2 className="text-xl font-bold text-white">
              💼 Open Candidates On Requirements
            </h2>
            <div className="flex items-center gap-2 flex-wrap">
              {designationData
                .filter((item) => item.designation === "No Designation")
                .map((item, idx) => (
                  <div
                    key={idx}
                    onClick={() => handleDesignationClick(item)}
                    className="text-sm font-semibold text-red-300 bg-red-500/10 border border-red-500/20 px-5 py-2 rounded-xl cursor-pointer hover:bg-red-500/20 hover:border-red-500/40 transition-all duration-200 shadow-sm whitespace-nowrap"
                  >
                    No Designation: {item.count}
                  </div>
                ))}
              <div className="text-sm text-blue-400 bg-blue-500/10 px-3 py-1 rounded-full whitespace-nowrap">
                Total Designations: {designationData.length}
              </div>
            </div>
          </div>

          {designationData.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              No designation data found
            </div>
          ) : (
            <div className="max-h-[400px] overflow-y-auto pr-2 scrollbar-hide mt-2">
              <div className="space-y-2">
                {designationData
                  .filter((item) => item.designation !== "No Designation")
                  .map((item, idx) => (
                    <div
                      key={idx}
                      onClick={() => handleDesignationClick(item)}
                      className="w-full min-h-[64px] bg-[#0f172a] border border-gray-700 rounded-md px-4 py-3 flex items-center justify-between hover:bg-blue-500/5 hover:border-blue-500/30 transition-all duration-200 cursor-pointer"
                    >
                      <div className="flex items-center justify-between w-full gap-3">
                        <span className="text-gray-200 text-sm font-semibold truncate group-hover:text-white transition-colors">
                          {item.designation}
                        </span>
                        <span className="text-blue-400 font-bold text-xl flex-shrink-0">
                          {item.count}
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>

        {/* CLOSED CLIENTS */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white">🎯 Candidates Joined</h2>
            <div className="text-sm text-green-400 bg-green-500/10 px-3 py-1 rounded-full whitespace-nowrap">
              Total Joined: {joinedCandidates.length}
            </div>
          </div>

          {joinedCandidates.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <div className="text-4xl mb-2">🎯</div>
              <p>No closed clients with "Joined" status yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-gray-700">
              <table className="w-full min-w-[700px] lg:min-w-[900px] text-xs sm:text-sm text-left text-gray-300">
                <thead className="bg-gray-900/80 text-gray-400 uppercase text-xs">
                  <tr>
                    <th className="px-4 py-3">Candidate Name</th>
                    <th className="px-4 py-3">Client Name</th>
                    <th className="px-4 py-3">Designation</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Joined Date</th>
                  </tr>
                </thead>
                <tbody>
                  {joinedCandidates.map((item, idx) => (
                    <tr
                      key={idx}
                      className="border-b border-gray-700 hover:bg-gray-700/20 transition-all"
                    >
                      <td className="px-4 py-3 text-white font-medium">
                        {item.candidateName}
                      </td>
                      <td className="px-4 py-3 text-blue-400">
                        {item.clientName}
                      </td>
                      <td className="px-4 py-3">
                        {item.designation}
                      </td>
                      <td className="px-4 py-3">
                        <span className="bg-green-500/10 text-green-400 px-3 py-1 rounded-full text-xs font-semibold">
                          {item.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-400">
                        {item.joinedDate
                          ? new Date(item.joinedDate).toLocaleDateString("en-GB")
                          : "N/A"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <ActivityPopup isOpen={popupOpen} onClose={closePopup} data={popupData} />
    </main>
  );
};

export default Home;