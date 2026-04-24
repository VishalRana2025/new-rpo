import React from "react";

const ActivityPopup = ({ isOpen, onClose, data }) => {
  if (!isOpen || !data) return null;

  const getActionColor = (action) => {
    switch (action) {
      case "Create": return "text-green-400";
      case "Update": return "text-blue-400";
      case "Delete": return "text-red-400";
      default: return "text-gray-400";
    }
  };

  const getActionBgColor = (action) => {
    switch (action) {
      case "Create": return "bg-green-900/50 border-green-700";
      case "Update": return "bg-blue-900/50 border-blue-700";
      case "Delete": return "bg-red-900/50 border-red-700";
      default: return "bg-gray-900/50 border-gray-700";
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" 
      onClick={onClose}
    >
      <div 
        className="bg-gray-800 rounded-xl border border-gray-700 max-w-2xl w-full max-h-[80vh] overflow-hidden shadow-2xl" 
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`bg-gradient-to-r from-gray-900 to-gray-800 p-5 border-b ${data.action === "Create" ? "border-green-700" : data.action === "Update" ? "border-blue-700" : "border-red-700"}`}>
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                {data.action === "Create" && "✚"}
                {data.action === "Update" && "✎"}
                {data.action === "Delete" && "🗑"}
                {data.action} Activities
              </h2>
              <p className="text-gray-400 text-sm mt-1">{data.date}</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto max-h-[60vh]">
          {/* Total Count */}
          <div className={`mb-4 p-3 rounded-lg border ${getActionBgColor(data.action)} bg-gray-900/30`}>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Total {data.action} Activities</span>
              <span className={`text-2xl font-bold ${getActionColor(data.action)}`}>
                {data.count || 0}
              </span>
            </div>
          </div>

          {/* Details List */}
          {data.details && data.details.length > 0 ? (
            <div className="space-y-3">
              <h3 className="text-white font-semibold mb-3">All Activities Today</h3>
              {data.details.map((item, idx) => (
                <div key={idx} className="bg-gray-900/50 rounded-lg p-3 border border-gray-700 hover:bg-gray-800/50 transition-all">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`inline-flex px-2 py-1 rounded text-xs font-medium ${
                          item.action === "CREATE" ? "bg-green-900/50 text-green-400" :
                          item.action === "UPDATE" ? "bg-blue-900/50 text-blue-400" :
                          "bg-red-900/50 text-red-400"
                        }`}>
                          {item.action}
                        </span>
                        <span className="text-xs text-gray-500 capitalize">{item.module}</span>
                      </div>
                      <p className="text-white text-sm font-medium">{item.itemName || item.itemId || "Unknown"}</p>
                      <p className="text-gray-400 text-xs mt-1 flex items-center gap-1">
                        <span>👤</span> {item.user || "System"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500">
                        {new Date(item.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <div className="text-5xl mb-2">📭</div>
              <p>No detailed activities found for {data.action}</p>
              <p className="text-xs mt-2">Activities will appear here when data is available</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-700 p-4 bg-gray-900/50">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ActivityPopup;