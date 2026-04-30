import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import ActivityChart from "../components/ActivityChart";
import ActivityPopup from "../components/ActivityPopup";

const Home = () => {
  const navigate = useNavigate();
  
  // ✅ DEFAULT CHART DATA (7 days placeholder)
  const defaultChartData = Array.from({ length: 7 }, (_, i) => ({
    date: new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000).toLocaleDateString(),
    create: 0,
    update: 0,
    createDetails: [],
    updateDetails: []
  }));

  // ✅ States with DEFAULT values (so UI shows immediately)
  const [createdData, setCreatedData] = useState(defaultChartData);
  const [updatedData, setUpdatedData] = useState(defaultChartData);
  const [recentActivities, setRecentActivities] = useState([]);
  const [summaryStats, setSummaryStats] = useState({
    total: { create: 0, update: 0, delete: 0 },
    candidate: { create: 0, update: 0, delete: 0 },
    requirement: { create: 0, update: 0, delete: 0 },
  });
  const [loading, setLoading] = useState(false);
  const [filterDays, setFilterDays] = useState(30);
  const [allClients, setAllClients] = useState([]);
  const [openClientData, setOpenClientData] = useState([]);
  const [closedClientData, setClosedClientData] = useState([]);
  
  // Popup state
  const [popupOpen, setPopupOpen] = useState(false);
  const [popupData, setPopupData] = useState(null);

  // ✅ Cache expiry time (5 minutes)
 const CACHE_EXPIRY = 30 * 1000;

  // ✅ GROUPING FUNCTION - Groups activities by recruiter/userName
  const groupByUser = (activities) => {
    const map = {};
    const limitedActivities = activities.slice(0, 200);
    limitedActivities.forEach((act) => {
      const user = act.userName;
      if (!user || user === "System") return;
      if (!map[user]) map[user] = 0;
      map[user]++;
    });
    return Object.keys(map).map((user) => ({
      user,
      count: map[user],
    })).sort((a, b) => b.count - a.count).slice(0, 20);
  };

  // ✅ FIXED: Format chart data with createDetails and updateDetails
  const formatChartData = (data, activities) => {
    if (!data || Object.keys(data).length === 0) return defaultChartData;
    
    const formatted = Object.keys(data)
      .map((date) => {
        const d = data[date] || {};
        
        // Convert date format (DD/MM/YYYY to YYYY-MM-DD)
        const dateParts = date.split("/");
        const dateObj = new Date(`${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`);
        const dateStr = dateObj.toISOString().split("T")[0];
        
        // Filter activities for this specific date
        const dateActivities = (activities || []).filter(act => {
          let actDate = "";
          if (act.action === "CREATE") {
            actDate = new Date(act.createdAt).toISOString().split("T")[0];
          } else if (act.action === "UPDATE") {
            actDate = new Date(act.updatedAt || act.createdAt).toISOString().split("T")[0];
          }
          return actDate === dateStr && act.module === "candidate";
        });
        
        // Separate CREATE and UPDATE activities
        const createActivities = dateActivities.filter(act => act.action === "CREATE");
        const updateActivities = dateActivities.filter(act => act.action === "UPDATE");
        
        const createDetails = groupByUser(createActivities);
        const updateDetails = groupByUser(updateActivities);
        
        return {
          date,
          create: d.CREATE || 0,
          update: d.UPDATE || 0,
          createDetails: createDetails,
          updateDetails: updateDetails,
        };
      })
      .filter((item) => item && item.date)
      .sort(
        (a, b) =>
          new Date(a.date.split("/").reverse().join("-")) -
          new Date(b.date.split("/").reverse().join("-"))
      );
    
    return formatted.length > 0 ? formatted : defaultChartData;
  };

  // ✅ LOAD FROM CACHE INSTANTLY (NO EXPIRY CHECK FOR DISPLAY)
  const loadFromCache = () => {
    try {
      const stored = localStorage.getItem("dashboardCache");
      if (stored) {
        const parsed = JSON.parse(stored);
        
        console.log("⚡ Loading from cache - UI visible instantly");
        console.log(`   Cache age: ${Math.round((Date.now() - parsed.timestamp) / 1000)} seconds`);
        
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
        return true;
      }
    } catch (err) {
      console.error("❌ Error loading from cache:", err);
    }
    return false;
  };

  // 🚀 LOAD FRESH DATA
  const loadDashboardData = async () => {
    console.log("🔄 Loading fresh data from API (filterDays:", filterDays, ")");
    
    // ✅ FIX ISSUE 1: Only show loader if NO cache exists
    if (!localStorage.getItem("dashboardCache")) {
      setLoading(true);
    }
    
    try {
      // Parallel API calls
      const [
        candidateRes,
        activitiesRes,
        summaryRes,
        clientsRes,
        candidatesRes
      ] = await Promise.all([
        api.get(`/activity-stats?days=${filterDays}&module=candidate`),
        api.get("/recent-activities?limit=100"),
        api.get("/activity-summary"),
        api.get("/clients"),
       api.get("/candidates?limit=100")
      ]);

      const allCandidates = candidatesRes.data || [];
      const candidates = allCandidates.slice(0, 200);
      const activities = activitiesRes.data || [];

      // ✅ Pass activities to formatChartData
      let candidateFormatted = formatChartData(candidateRes.data, activities);
      candidateFormatted = candidateFormatted.slice(0, 90);
      
      // Split into separate chart data for create and update views
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

      // Set summary stats
      const summaryData = summaryRes.data || {
        total: { create: 0, update: 0, delete: 0 },
        candidate: { create: 0, update: 0, delete: 0 },
        requirement: { create: 0, update: 0, delete: 0 },
      };
      setSummaryStats(summaryData);

      // Process clients
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
      
      // Open clients
      const openCandidates = candidates.filter(c => 
        c.status && c.status.toLowerCase() !== "rejected"
      );
      
      const clientMap = {};
      for (const c of openCandidates) {
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

      // Closed clients (Joined)
      const closedMap = {};
      for (const c of candidates) {
        let lastClient = null;
        let lastStatus = null;
        if (Array.isArray(c.clientSections) && c.clientSections.length > 0) {
          for (let i = c.clientSections.length - 1; i >= 0; i--) {
            const section = c.clientSections[i];
            if (
              section.clientName && 
              section.clientName.trim() !== "" &&
              section.clientStatus?.toLowerCase() !== "rejected- client"
            ) {
              lastClient = section.clientName.trim();
              lastStatus = section.clientStatus;
              break;
            }
          }
        }
        const status = lastStatus?.toString().trim().toLowerCase();
        if (!lastClient || !status || status !== "joined") continue;
        const clientName = clientNameMap[lastClient.toLowerCase()] || lastClient;
        closedMap[clientName] = (closedMap[clientName] || 0) + 1;
      }
      
      const closedClients = Object.keys(closedMap).map(name => ({
        clientName: name,
        count: closedMap[name]
      })).sort((a, b) => b.count - a.count).slice(0, 50);
      
      setClosedClientData(closedClients);

      // Save to cache
      const cacheData = {
        createdData: createdOnly,
        updatedData: updatedOnly,
        recentActivities: activities.slice(0, 15),
        summaryStats: summaryData,
        allClients: chartClients,
        openClientData: formattedClients,
        closedClientData: closedClients,
        filterDays: filterDays,
        timestamp: Date.now()
      };
      
      localStorage.setItem("dashboardCache", JSON.stringify(cacheData));
      console.log("✅ Data cached to localStorage with recruiter details");

    } catch (err) {
      console.error("❌ Error loading dashboard data:", err);
    } finally {
      setLoading(false);
    }
  };

  // ✅ FIXED useEffect - LIKE REQUIREMENTS PAGE (with cleaner cache check)
useEffect(() => {
  try {
    const cached = localStorage.getItem("dashboardCache");

    if (cached) {
      const parsed = JSON.parse(cached);

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

      console.log("⚡ Loaded from cache (NO AUTO REFRESH)");
    } else {
      // Only first time (no cache)
      loadDashboardData();
    }

  } catch (e) {
    console.log("⚠️ Cache error → loading fresh data");
    loadDashboardData();
  }
}, [filterDays]);
  // Handle bar click
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

  // Handle client bar click
  const handleClientBarClick = (data) => {
    if (!data || !data.date) return;
    navigate(`/clients?name=${encodeURIComponent(data.date)}`);
  };

  const closePopup = () => {
    setPopupOpen(false);
    setPopupData(null);
  };

  // Manual refresh - clears cache and forces API call
  const handleRefresh = () => {
    console.log("🔄 Manual refresh - clearing cache and fetching fresh data");
    localStorage.removeItem("dashboardCache");
    loadDashboardData();
  };

  const handleClearCache = () => {
    if (window.confirm("Clear dashboard cache?")) {
      localStorage.removeItem("dashboardCache");
      alert("Cache cleared ✅");
      loadDashboardData();
    }
  };

  const totalActivities = summaryStats 
    ? (summaryStats.total?.create || 0) + (summaryStats.total?.update || 0)
    : 0;

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
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="max-w-[1600px] mx-auto p-6">
        
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-white tracking-tight">Candidate Dashboard</h1>
              <p className="text-gray-400 mt-2">Real-time activity monitoring & analytics</p>
            </div>
            <button
              onClick={handleClearCache}
              className="text-xs text-gray-500 hover:text-red-400 transition-colors"
              title="Clear cache"
            >
              🗑️ Clear Cache
            </button>
          </div>
          {/* Cache status indicator */}
          {localStorage.getItem("dashboardCache") && (() => {
            const stored = localStorage.getItem("dashboardCache");
            const parsed = JSON.parse(stored);
            const isExpired = Date.now() - parsed.timestamp > CACHE_EXPIRY;
            return (
              <div className="mt-2 flex items-center gap-2">
                <span className={`text-xs px-2 py-1 rounded-full ${
                  isExpired 
                    ? "text-yellow-400 bg-yellow-500/10" 
                    : "text-green-400 bg-green-500/10"
                }`}>
                  {isExpired ? "⏳ Cache expired (updating)" : "⚡ Data from cache"}
                </span>
                <span className="text-xs text-gray-500">
                  • Cached {getCacheAge()} ago
                </span>
              </div>
            );
          })()}
        </div>

        {/* TOP CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700 hover:border-gray-600 transition-all group">
            <div className="flex items-center justify-between mb-3">
              <p className="text-gray-400 text-sm font-medium">Total Activities</p>
              <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center group-hover:bg-blue-500/20 transition-all">
                <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
            </div>
            <h2 className="text-3xl font-bold text-white">{totalActivities}</h2>
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
            <h2 className="text-3xl font-bold text-green-400">{summaryStats?.total?.create || 0}</h2>
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
            <h2 className="text-3xl font-bold text-yellow-400">{summaryStats?.total?.update || 0}</h2>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 mb-8 border border-gray-700">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-400">Time Range:</label>
              <select
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold text-lg">🟢 Created Candidates</h3>
              <span className="text-xs text-gray-500">Last {filterDays} days</span>
            </div>
            <div className="h-[380px] bg-gray-900/50 rounded-lg overflow-hidden">
              <ActivityChart data={createdData} onBarClick={handleBarClick} />
            </div>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold text-lg">🟡 Updated Candidates</h3>
              <span className="text-xs text-gray-500">Last {filterDays} days</span>
            </div>
            <div className="h-[380px] bg-gray-900/50 rounded-lg overflow-hidden">
              <ActivityChart data={updatedData} onBarClick={handleBarClick} />
            </div>
          </div>
        </div>

        {/* CLIENTS DISTRIBUTION CHART */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white">🏢 All Clients Distribution</h2>
            <div className="text-sm text-blue-400 bg-blue-500/10 px-3 py-1 rounded-full">
              Total Clients: {allClients.length}
            </div>
          </div>

          {allClients.length === 0 ? (
            <div className="text-center py-8 text-gray-400">No client data available</div>
          ) : (
            <div className="h-[400px] bg-gray-900/50 rounded-lg p-4">
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

        {/* OPEN CLIENTS */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white">🚀 Open Clients</h2>
            <div className="text-sm text-blue-400 bg-blue-500/10 px-3 py-1 rounded-full">
              Total Open: {openClientData.reduce((sum, c) => sum + c.count, 0)} candidates
            </div>
          </div>

          {openClientData.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <div className="text-4xl mb-2">🚀</div>
              <p>No open clients with active candidates</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {openClientData.map((client, idx) => (
                <div
                  key={idx}
                  className="bg-gradient-to-r from-blue-900/20 to-gray-900/50 border border-blue-500/20 rounded-lg p-4 hover:border-blue-500/40 transition-all group cursor-pointer"
                  onClick={() => navigate(`/clients?name=${encodeURIComponent(client.clientName)}`)}
                >
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300 font-medium group-hover:text-blue-400 transition-colors">
                      {client.clientName}
                    </span>
                    <span className="text-blue-400 font-bold text-lg">{client.count}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* CLOSED CLIENTS */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white">🎯 Closed Clients (Joined)</h2>
            <div className="text-sm text-green-400 bg-green-500/10 px-3 py-1 rounded-full">
              Total Joined: {closedClientData.reduce((sum, c) => sum + c.count, 0)}
            </div>
          </div>

          {closedClientData.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <div className="text-4xl mb-2">🎯</div>
              <p>No closed clients with "Joined" status yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {closedClientData.map((client, idx) => (
                <div
                  key={idx}
                  className="bg-gradient-to-r from-green-900/20 to-gray-900/50 border border-green-500/20 rounded-lg p-4 hover:border-green-500/40 transition-all group cursor-pointer"
                  onClick={() => navigate(`/clients?name=${encodeURIComponent(client.clientName)}`)}
                >
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300 font-medium group-hover:text-green-400 transition-colors">
                      {client.clientName}
                    </span>
                    <span className="text-green-400 font-bold text-lg">{client.count}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      <ActivityPopup isOpen={popupOpen} onClose={closePopup} data={popupData} />
    </div>
  );
};

export default Home;