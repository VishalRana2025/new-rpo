import React, { useEffect, useState } from "react";
import api from "../api";

const Home = () => {
  const [chartData, setChartData] = useState([]);
  const [recentActivities, setRecentActivities] = useState([]);
  const [summaryStats, setSummaryStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filterModule, setFilterModule] = useState("all");
  const [filterDays, setFilterDays] = useState(30);

  useEffect(() => {
    loadDashboardData();
  }, [filterModule, filterDays]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // Load chart data - FIXED: Added /api/ prefix
      const chartRes = await api.get(`/api/activity-stats?days=${filterDays}&module=${filterModule}`);
      const formatted = Object.keys(chartRes.data).map(date => ({
        date,
        create: chartRes.data[date].CREATE,
        update: chartRes.data[date].UPDATE,
        delete: chartRes.data[date].DELETE
      })).sort((a, b) => new Date(a.date.split("/").reverse().join("-")) - new Date(b.date.split("/").reverse().join("-")));
      
      setChartData(formatted);

      // Load recent activities - FIXED: Added /api/ prefix
      const activitiesRes = await api.get("/api/recent-activities?limit=15");
      setRecentActivities(activitiesRes.data);

      // Load summary stats - FIXED: Added /api/ prefix
      const summaryRes = await api.get("/api/activity-summary");
      setSummaryStats(summaryRes.data);
    } catch (err) {
      console.error("Error loading dashboard data:", err);
    } finally {
      setLoading(false);
    }
  };

  const getActionBadge = (action) => {
    switch (action) {
      case "CREATE": return "bg-green-900/50 text-green-400 border border-green-700";
      case "UPDATE": return "bg-blue-900/50 text-blue-400 border border-blue-700";
      case "DELETE": return "bg-red-900/50 text-red-400 border border-red-700";
      default: return "bg-gray-900/50 text-gray-400 border border-gray-700";
    }
  };

  const getModuleIcon = (module) => {
    switch (module) {
      case "candidate": return "👤";
      case "requirement": return "📋";
      default: return "📦";
    }
  };

  // Get max value for bar chart scaling
  const maxValue = Math.max(
    ...chartData.flatMap(d => [d.create, d.update, d.delete]),
    1
  );

  const totalActivities = summaryStats 
    ? summaryStats.total.create + summaryStats.total.update + summaryStats.total.delete 
    : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4" />
          <p className="text-gray-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-[1600px] mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-white">Dashboard</h1>
          <p className="text-gray-400 mt-1">Activity overview & analytics</p>
        </div>

        {/* Filter Bar */}
        <div className="mb-6 flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-400">Module:</label>
            <select
              value={filterModule}
              onChange={(e) => setFilterModule(e.target.value)}
              className="bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-1.5 text-sm"
            >
              <option value="all">All</option>
              <option value="candidate">Candidates</option>
              <option value="requirement">Requirements</option>
            </select>
          </div>
          
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-400">Days:</label>
            <select
              value={filterDays}
              onChange={(e) => setFilterDays(parseInt(e.target.value))}
              className="bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-1.5 text-sm"
            >
              <option value="7">Last 7 days</option>
              <option value="15">Last 15 days</option>
              <option value="30">Last 30 days</option>
              <option value="60">Last 60 days</option>
              <option value="90">Last 90 days</option>
            </select>
          </div>
          
          <button
            onClick={loadDashboardData}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-lg text-sm transition-all"
          >
            Refresh
          </button>
        </div>

        {/* Stats Cards */}
        {summaryStats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-gray-900 rounded-lg p-5 border border-gray-800">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Total Activities</p>
                  <p className="text-3xl font-bold text-white mt-1">{totalActivities}</p>
                </div>
                <div className="text-4xl">📊</div>
              </div>
            </div>
            
            <div className="bg-gray-900 rounded-lg p-5 border border-gray-800">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Created</p>
                  <p className="text-3xl font-bold text-green-400 mt-1">{summaryStats.total.create}</p>
                </div>
                <div className="text-4xl">➕</div>
              </div>
            </div>
            
            <div className="bg-gray-900 rounded-lg p-5 border border-gray-800">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Updated</p>
                  <p className="text-3xl font-bold text-blue-400 mt-1">{summaryStats.total.update}</p>
                </div>
                <div className="text-4xl">✏️</div>
              </div>
            </div>
            
            <div className="bg-gray-900 rounded-lg p-5 border border-gray-800">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Deleted</p>
                  <p className="text-3xl font-bold text-red-400 mt-1">{summaryStats.total.delete}</p>
                </div>
                <div className="text-4xl">🗑️</div>
              </div>
            </div>
          </div>
        )}

        {/* CSS Bar Chart */}
        <div className="bg-gray-900 rounded-lg p-5 border border-gray-800 mb-8">
          <h3 className="text-white font-semibold mb-4">Activity Timeline</h3>
          {chartData.length > 0 ? (
            <div className="overflow-x-auto">
              <div className="min-w-[600px]">
                {chartData.map((item, idx) => (
                  <div key={idx} className="mb-4">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-gray-400">{item.date}</span>
                    </div>
                    <div className="space-y-2">
                      {/* Create bar */}
                      <div className="flex items-center gap-3">
                        <div className="w-16 text-xs text-green-400">Create</div>
                        <div className="flex-1 h-6 bg-gray-800 rounded overflow-hidden">
                          <div 
                            className="h-full bg-green-500 rounded transition-all duration-500 flex items-center justify-end px-2 text-xs text-white"
                            style={{ width: `${(item.create / maxValue) * 100}%` }}
                          >
                            {item.create > 0 && item.create}
                          </div>
                        </div>
                      </div>
                      {/* Update bar */}
                      <div className="flex items-center gap-3">
                        <div className="w-16 text-xs text-blue-400">Update</div>
                        <div className="flex-1 h-6 bg-gray-800 rounded overflow-hidden">
                          <div 
                            className="h-full bg-blue-500 rounded transition-all duration-500 flex items-center justify-end px-2 text-xs text-white"
                            style={{ width: `${(item.update / maxValue) * 100}%` }}
                          >
                            {item.update > 0 && item.update}
                          </div>
                        </div>
                      </div>
                      {/* Delete bar */}
                      <div className="flex items-center gap-3">
                        <div className="w-16 text-xs text-red-400">Delete</div>
                        <div className="flex-1 h-6 bg-gray-800 rounded overflow-hidden">
                          <div 
                            className="h-full bg-red-500 rounded transition-all duration-500 flex items-center justify-end px-2 text-xs text-white"
                            style={{ width: `${(item.delete / maxValue) * 100}%` }}
                          >
                            {item.delete > 0 && item.delete}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <div className="text-5xl mb-2">📭</div>
              <p>No activity data available</p>
            </div>
          )}
        </div>

        {/* Simple Stats Cards Row 2 */}
        {summaryStats && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-gray-900 rounded-lg p-5 border border-gray-800">
              <h3 className="text-white font-semibold mb-3">Candidate Stats</h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-green-400">Created</span>
                  <span className="text-white font-bold">{summaryStats.candidate.create}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-blue-400">Updated</span>
                  <span className="text-white font-bold">{summaryStats.candidate.update}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-red-400">Deleted</span>
                  <span className="text-white font-bold">{summaryStats.candidate.delete}</span>
                </div>
              </div>
            </div>
            
            <div className="bg-gray-900 rounded-lg p-5 border border-gray-800">
              <h3 className="text-white font-semibold mb-3">Requirement Stats</h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-green-400">Created</span>
                  <span className="text-white font-bold">{summaryStats.requirement.create}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-blue-400">Updated</span>
                  <span className="text-white font-bold">{summaryStats.requirement.update}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-red-400">Deleted</span>
                  <span className="text-white font-bold">{summaryStats.requirement.delete}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Recent Activities Table */}
        <div className="bg-gray-900 rounded-lg border border-gray-800 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-800">
            <h3 className="text-white font-semibold">Recent Activities</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-800/50">
                <tr>
                  <th className="px-5 py-3 text-left text-gray-400 font-medium">Action</th>
                  <th className="px-5 py-3 text-left text-gray-400 font-medium">Module</th>
                  <th className="px-5 py-3 text-left text-gray-400 font-medium">Item</th>
                  <th className="px-5 py-3 text-left text-gray-400 font-medium">User</th>
                  <th className="px-5 py-3 text-left text-gray-400 font-medium">Date & Time</th>
                </tr>
              </thead>
              <tbody>
                {recentActivities.length > 0 ? (
                  recentActivities.map((activity, index) => (
                    <tr key={activity._id || index} className="border-b border-gray-800 hover:bg-gray-800/30 transition-colors">
                      <td className="px-5 py-3">
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${getActionBadge(activity.action)}`}>
                          {activity.action}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <span className="flex items-center gap-2 text-gray-300">
                          <span>{getModuleIcon(activity.module)}</span>
                          <span className="capitalize">{activity.module}</span>
                        </span>
                      </td>
                      <td className="px-5 py-3 text-gray-300 max-w-xs truncate">
                        {activity.itemName || activity.itemId || "-"}
                      </td>
                      <td className="px-5 py-3 text-gray-400 text-sm">
                        {activity.userName || activity.userId || "System"}
                      </td>
                      <td className="px-5 py-3 text-gray-400 text-sm">
                        {new Date(activity.createdAt).toLocaleString("en-IN", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit"
                        })}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="px-5 py-12 text-center text-gray-500">
                      <div className="text-5xl mb-2">📭</div>
                      <p>No recent activities</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;