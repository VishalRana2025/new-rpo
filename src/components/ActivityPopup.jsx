import React from "react";

const ActivityPopup = ({ isOpen, onClose, data }) => {
  if (!isOpen || !data) return null;

 const { actionType, details, date, type } = data;

  // Determine title based on action type
  const getTitle = () => {
    if (actionType === "create") return "📝 Created Candidates";
    if (actionType === "update") return "✏️ Updated Candidates";
    if (actionType === "delete") return "🗑️ Deleted Candidates";
    return "";
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
                {/* <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Recruiter</span> */}
                {/* <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Forms</span> */}
              </div>
              
              {/* Recruiter List */}
              <div className="space-y-2 max-h-96 overflow-y-auto">
{type === "designation" || type === "no-client" ? (

  details.map((candidate, index) => (

    <div
      key={index}
      className="bg-gray-800/50 rounded-lg p-4 border border-gray-700"
    >

      <div className="flex justify-between items-center mb-2">
 c
    <span className="text-white font-semibold">
  {candidate.name || candidate.candidateName}
</span>
        <span className={`text-xs ${textColorClass}`}>
          {candidate.status}
        </span>

      </div>

    <p className="text-sm text-blue-400">
  Client: {candidate.clientName || "Not Added"}
</p>

<p className="text-sm text-gray-400 mt-1">
  Designation: {candidate.designation || "No Designation"}
</p>
    </div>

  ))

) : (

  details.map((item, index) => (

    <div
      key={index}
      className="bg-gray-800/50 rounded-lg p-4 border border-gray-700"
    >

      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-3">

          <span className="text-gray-500 text-sm font-mono">
            #{index + 1}
          </span>

          <span className="text-gray-200 font-semibold text-lg">
            {item.user || "Unknown"}
          </span>

        </div>

        <span className={`text-xl font-bold ${textColorClass}`}>
          {item.count}
        </span>
      </div>

      <div className="space-y-2">

        {item.candidates?.map((candidate, idx) => (

          <div
            key={idx}
            className="bg-gray-900 border border-gray-700 rounded-md p-2"
          >

            <div className="flex justify-between items-center">

              <p className="text-white text-sm font-medium">
                {candidate.candidateName}
              </p>

              <span className={`text-xs ${textColorClass}`}>
                {candidate.action}
              </span>

            </div>

          </div>

        ))}

      </div>

    </div>

  ))

)}
              </div>

              {/* Total Summary */}
              <div className="mt-4 pt-3 border-t border-gray-700 flex justify-between items-center">
                <span className="text-sm text-gray-400">Total Recruiters</span>
                <span className={`text-lg font-semibold ${textColorClass}`}>
                 {details.reduce((sum, item) => sum + (item.count || 0), 0)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                {/* <span className="text-sm text-gray-400">Total Forms</span> */}
                {/* <span className={`text-lg font-semibold ${textColorClass}`}>
                  {details.reduce((sum, item) => sum + (item.count || 0), 0)}
                </span> */}
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