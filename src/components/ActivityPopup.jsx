import React from "react";

const ActivityPopup = ({ isOpen, onClose, data }) => {
  if (!isOpen || !data) return null;

  const { actionType, details, date } = data;

  // Determine title based on action type
  const getTitle = () => {
    if (actionType === "create") return "📝 Created Candidates";
    if (actionType === "update") return "✏️ Updated Candidates";
    if (actionType === "delete") return "🗑️ Deleted Candidates";
    return "Activity Details";
  };

  // Get color scheme based on action type
  const getColorScheme = () => {
    if (actionType === "create") return "green";
    if (actionType === "update") return "yellow";
    if (actionType === "delete") return "red";
    return "blue";
  };

  const colorScheme = getColorScheme();
  const textColorClass = {
    green: "text-green-400",
    yellow: "text-yellow-400",
    red: "text-red-400",
    blue: "text-blue-400"
  }[colorScheme];

  const borderColorClass = {
    green: "border-green-500/30",
    yellow: "border-yellow-500/30",
    red: "border-red-500/30",
    blue: "border-blue-500/30"
  }[colorScheme];

  const bgColorClass = {
    green: "bg-green-500/10",
    yellow: "bg-yellow-500/10",
    red: "bg-red-500/10",
    blue: "bg-blue-500/10"
  }[colorScheme];

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className={`bg-gray-900 rounded-xl shadow-2xl max-w-lg w-full border-l-4 ${borderColorClass} overflow-hidden`}>
        {/* Header */}
        <div className={`px-6 py-4 border-b border-gray-800 flex justify-between items-center ${bgColorClass}`}>
          <div>
            <h2 className={`text-xl font-bold ${textColorClass}`}>{getTitle()}</h2>
            {date && <p className="text-sm text-gray-400 mt-1">{date}</p>}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-200 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body - Recruiter Summary */}
        <div className="p-6">
          {details && details.length > 0 ? (
            <div className="space-y-3">
              {/* Header Row */}
              <div className="flex justify-between items-center pb-2 border-b border-gray-700">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Recruiter</span>
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Forms</span>
              </div>
              
              {/* Recruiter List */}
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {details.map((item, index) => (
                  <div 
                    key={index} 
                    className="flex justify-between items-center p-3 bg-gray-800/50 rounded-lg hover:bg-gray-800 transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-gray-500 text-sm font-mono">#{index + 1}</span>
                      <span className="text-gray-200 font-medium">
                        {item.user || item.recruiter || "Unknown"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-2xl font-bold ${textColorClass}`}>
                        {item.count}
                      </span>
                      <span className="text-xs text-gray-500"></span>
                      {/* Trophy for top performer */}
                      {index === 0 && details.length > 1 && (
                        <span className="text-yellow-400 text-lg ml-1"></span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Total Summary */}
              <div className="mt-4 pt-3 border-t border-gray-700 flex justify-between items-center">
                <span className="text-sm text-gray-400">Total Recruiters</span>
                <span className={`text-lg font-semibold ${textColorClass}`}>
                  {details.length}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">Total Forms</span>
                <span className={`text-lg font-semibold ${textColorClass}`}>
                  {details.reduce((sum, item) => sum + (item.count || 0), 0)}
                </span>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-5xl mb-4">📭</div>
              <p className="text-gray-400">No activities found for this period</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-800 bg-gray-900/50 flex justify-end">
          <button
            onClick={onClose}
            className={`px-4 py-2 ${bgColorClass} ${textColorClass} rounded-lg text-sm font-medium hover:opacity-80 transition-all`}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ActivityPopup;