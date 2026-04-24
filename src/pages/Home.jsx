import React, { useEffect, useState } from "react";
import api from "../api";
import ActivityChart from "../components/ActivityChart";
import ActivityPopup from "../components/ActivityPopup";

const Home = () => {
  // ✅ States for CREATE, UPDATE, DELETE
  const [createdData, setCreatedData] = useState([]);
  const [updatedData, setUpdatedData] = useState([]);
  const [deleteData, setDeleteData] = useState([]);
  const [recentActivities, setRecentActivities] = useState([]);
  const [summaryStats, setSummaryStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filterDays, setFilterDays] = useState(30);
  
  // Popup state
  const [popupOpen, setPopupOpen] = useState(false);
  const [popupData, setPopupData] = useState(null);

  useEffect(() => {
    loadDashboardData();
  }, [filterDays]);

  // Format chart data helper function
  const formatChartData = (data) => {
    if (!data || Object.keys(data).length === 0) return [];
    
    return Object.keys(data)
      .map((date) => {
        const d = data[date] || {};
        return {
          date,
          create: d.CREATE || 0,
          update: d.UPDATE || 0,
          delete: d.DELETE || 0,
          createDetails: [],
          updateDetails: [],
          deleteDetails: []
        };
      })
      .filter((item) => item && item.date)
      .sort(
        (a, b) =>
          new Date(a.date.split("/").reverse().join("-")) -
          new Date(b.date.split("/").reverse().join("-"))
      );
  };

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // Fetch chart data for CANDIDATE only
      const candidateRes = await api.get(
        `/activity-stats?days=${filterDays}&module=candidate`
      );

      // Format candidate data
      let candidateFormatted = formatChartData(candidateRes.data);

      // Fetch recent activities for details
      const activitiesRes = await api.get("/recent-activities?limit=100");
      const activities = activitiesRes.data || [];
      
      // Populate details for CANDIDATE chart
      candidateFormatted.forEach(day => {
        const dayDate = new Date(day.date.split("/").reverse().join("-"));
        const dayDateStr = dayDate.toISOString().split("T")[0];
        
        const dayActivities = activities
          .filter(act => {
            const actDate = new Date(act.createdAt).toISOString().split("T")[0];
            return actDate === dayDateStr && act.module === "candidate";
          })
          .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        
        day.createDetails = dayActivities
          .filter(act => act.action === "CREATE")
          .map(act => ({
            action: act.action,
            module: act.module,
            itemName: act.itemName,
            user: act.userName || act.userId || "System",
            time: act.createdAt
          }));
          
        day.updateDetails = dayActivities
          .filter(act => act.action === "UPDATE")
          .map(act => ({
            action: act.action,
            module: act.module,
            itemName: act.itemName,
            user: act.userName || act.userId || "System",
            time: act.createdAt
          }));
          
        day.deleteDetails = dayActivities
          .filter(act => act.action === "DELETE")
          .map(act => ({
            action: act.action,
            module: act.module,
            itemName: act.itemName,
            user: act.userName || act.userId || "System",
            time: act.createdAt
          }));
      });

      // ✅ SPLIT into CREATE only, UPDATE only, DELETE only
      const createdOnly = candidateFormatted.map(item => ({
        ...item,
        update: 0,
        delete: 0
      }));

      const updatedOnly = candidateFormatted.map(item => ({
        ...item,
        create: 0,
        delete: 0
      }));

      const deletedOnly = candidateFormatted.map(item => ({
        ...item,
        create: 0,
        update: 0
      }));

      // Set state for all three charts
      setCreatedData(createdOnly);
      setUpdatedData(updatedOnly);
      setDeleteData(deletedOnly);
      setRecentActivities(activities.slice(0, 15));

      // Fetch summary stats
      const summaryRes = await api.get("/activity-summary");
      setSummaryStats(
        summaryRes.data || {
          total: { create: 0, update: 0, delete: 0 },
          candidate: { create: 0, update: 0, delete: 0 },
          requirement: { create: 0, update: 0, delete: 0 },
        }
      );

    } catch (err) {
      console.error("❌ Error loading dashboard data:", err);
      setCreatedData([]);
      setUpdatedData([]);
      setDeleteData([]);
      setRecentActivities([]);
      setSummaryStats({
        total: { create: 0, update: 0, delete: 0 },
        candidate: { create: 0, update: 0, delete: 0 },
        requirement: { create: 0, update: 0, delete: 0 },
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle bar click from chart
  const handleBarClick = (data) => {
    console.log("Bar clicked:", data);
    setPopupData(data);
    setPopupOpen(true);
  };

  // Close popup
  const closePopup = () => {
    setPopupOpen(false);
    setPopupData(null);
  };

  const totalActivities = summaryStats 
    ? (summaryStats.total?.create || 0) + (summaryStats.total?.update || 0) + (summaryStats.total?.delete || 0)
    : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4" />
          <p className="text-gray-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="max-w-[1600px] mx-auto p-6">
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white tracking-tight">Candidate Dashboard</h1>
          <p className="text-gray-400 mt-2">Real-time activity monitoring & analytics</p>
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
              onClick={loadDashboardData}
              className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg text-sm transition-all flex items-center gap-2 ml-auto"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
          </div>
        </div>

        {/* TOP CARDS - 4 Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Activities Card */}
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
            <p className="text-green-400 text-sm mt-2">↑ +12% from last month</p>
          </div>

          {/* Created Card */}
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
            <p className="text-gray-500 text-sm mt-2">New entries added</p>
          </div>

          {/* Updated Card */}
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
            <p className="text-gray-500 text-sm mt-2">Records modified</p>
          </div>

          {/* Deleted Card */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700 hover:border-gray-600 transition-all group">
            <div className="flex items-center justify-between mb-3">
              <p className="text-gray-400 text-sm font-medium">Deleted</p>
              <div className="w-10 h-10 bg-red-500/10 rounded-lg flex items-center justify-center group-hover:bg-red-500/20 transition-all">
                <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
            </div>
            <h2 className="text-3xl font-bold text-red-400">{summaryStats?.total?.delete || 0}</h2>
            <p className="text-gray-500 text-sm mt-2">Records removed</p>
          </div>
        </div>

        {/* ACTIVITY OVERVIEW - 3 COLUMN LAYOUT */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">

          {/* LEFT CHART - ONLY CREATE ACTIVITIES */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold text-lg">
                🟢 Created Candidates
              </h3>
              <span className="text-xs text-gray-500">
                Last {filterDays} days
              </span>
            </div>
            <div className="h-[380px] bg-gray-900/50 rounded-lg overflow-hidden">
              {createdData.length > 0 ? (
                <ActivityChart data={createdData} onBarClick={handleBarClick} />
              ) : (
                <div className="h-full flex items-center justify-center text-gray-400">
                  <div className="text-center">
                    <div className="text-4xl mb-2">📭</div>
                    <p>No created data available</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* MIDDLE CHART - ONLY UPDATE ACTIVITIES */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold text-lg">
                🟡 Updated Candidates
              </h3>
              <span className="text-xs text-gray-500">
                Last {filterDays} days
              </span>
            </div>
            <div className="h-[380px] bg-gray-900/50 rounded-lg overflow-hidden">
              {updatedData.length > 0 ? (
                <ActivityChart data={updatedData} onBarClick={handleBarClick} />
              ) : (
                <div className="h-full flex items-center justify-center text-gray-400">
                  <div className="text-center">
                    <div className="text-4xl mb-2">📭</div>
                    <p>No updated data available</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT CHART - ONLY DELETE ACTIVITIES */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold text-lg">
                🔴 Deleted Candidates
              </h3>
              <span className="text-xs text-gray-500">
                Last {filterDays} days
              </span>
            </div>
            <div className="h-[380px] bg-gray-900/50 rounded-lg overflow-hidden">
              {deleteData.length > 0 ? (
                <ActivityChart data={deleteData} onBarClick={handleBarClick} />
              ) : (
                <div className="h-full flex items-center justify-center text-gray-400">
                  <div className="text-center">
                    <div className="text-4xl mb-2">📭</div>
                    <p>No deleted data available</p>
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Candidate Stats */}
        {summaryStats && (
          <div className="grid grid-cols-1 gap-6 mb-8">
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
              <h3 className="text-white font-semibold mb-4">Candidate Activity Summary</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex justify-between items-center p-3 bg-gray-900/50 rounded-lg">
                  <span className="text-green-400">✅ Created</span>
                  <span className="text-2xl font-bold text-white">{summaryStats.candidate?.create || 0}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-900/50 rounded-lg">
                  <span className="text-yellow-400">✏️ Updated</span>
                  <span className="text-2xl font-bold text-white">{summaryStats.candidate?.update || 0}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-900/50 rounded-lg">
                  <span className="text-red-400">🗑️ Deleted</span>
                  <span className="text-2xl font-bold text-white">{summaryStats.candidate?.delete || 0}</span>
                </div>
              </div>
            </div>
          </div>
        )}

       
      </div>

      {/* Activity Popup */}
      <ActivityPopup 
        isOpen={popupOpen}
        onClose={closePopup}
        data={popupData}
      />
    </div>
  );
};

export default Home;