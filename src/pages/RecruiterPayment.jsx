import React, { useState, useEffect } from "react";
import api from "../api";

const RecruiterPayment = () => {
  const [candidates, setCandidates] = useState([]);
  const [requirements, setRequirements] = useState([]);
  const [clients, setClients] = useState([]); // ✅ STEP 1: ADD CLIENT STATE
  const [loading, setLoading] = useState(false);

  // ✅ STEP 2: LOAD CLIENT DATA FUNCTION
  const loadClients = async () => {
    try {
      const res = await api.get("/clients");
      setClients(res.data || []);
      console.log("Clients loaded:", res.data);
    } catch (err) {
      console.error("Error loading clients:", err);
    }
  };

  useEffect(() => {
    loadCandidates();
    loadRequirements();
    loadClients(); // ✅ STEP 3: CALL IT
  }, []);

  const loadCandidates = async () => {
    setLoading(true);
    try {
      const res = await api.get("/candidates");
      setCandidates(res.data || []);
      // ✅ Debug: Check candidate data structure
      console.log("ALL candidates:", res.data);
      res.data?.forEach((c, idx) => {
        console.log(`Candidate ${idx + 1}:`, {
          name: `${c.firstName} ${c.lastName}`,
          clientSections: c.clientSections,
          status: getLatestStatus(c)
        });
      });
    } catch (err) {
      console.error("Error loading candidates:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadRequirements = async () => {
    try {
      const res = await api.get("/requirements");
      setRequirements(res.data || []);
      console.log("Requirements loaded:", res.data);
    } catch (err) {
      console.error("Error loading requirements:", err);
    }
  };

  // ✅ STEP 1: Get latest status from clientSections
  const getLatestStatus = (candidate) => {
    if (!candidate.clientSections || candidate.clientSections.length === 0) {
      return "";
    }
    const last = [...candidate.clientSections]
      .reverse()
      .find(cs => cs.clientStatus && cs.clientStatus.trim() !== "");
    return last?.clientStatus || "";
  };
const getJoinedDate = (candidate) => {
  if (!candidate.clientSections || candidate.clientSections.length === 0) {
    return "-";
  }

  const lastJoined = [...candidate.clientSections]
    .reverse()
    .find(cs => cs.clientStatus === "Joined");

  return lastJoined?.joinedDate || "-";
};
const getPaymentDate = (joinedDate, term) => {
  if (!joinedDate || joinedDate === "-") return "-";

  const date = new Date(joinedDate);

  let days = 0;

  // 🔥 convert term to days
  if (term === "Monthly") days = 30;
  else if (term === "Quarterly") days = 90;
  else if (term === "Half-Yearly") days = 180;
  else if (term === "Yearly") days = 365;
  else if (!isNaN(term)) days = Number(term); // if numeric like "30"

  date.setDate(date.getDate() + days);

  return date.toISOString().split("T")[0];
};
  // ✅ STEP 2: Get designation from clientSections (SAME as AllCandidates)
  const getDesignation = (candidate) => {
    if (!candidate.clientSections?.length) return "-";
    
    const lastValidDesignation = [...candidate.clientSections]
      .reverse()
      .find(cs => cs.designation && cs.designation.trim() !== "");
    
    return lastValidDesignation?.designation || "-";
  };

  // ✅ STEP 4: GET CLIENT NAME FROM CANDIDATE
  const getClientName = (candidate) => {
    if (!candidate.clientSections?.length) return "-";
    const lastValidClient = [...candidate.clientSections]
      .reverse()
      .find(cs => cs.clientName && cs.clientName.trim() !== "");
    return lastValidClient?.clientName || "-";
  };

  // ✅ STEP 5: GET PAYMENT TERM FROM CLIENT (EXACT MATCH)
  const getPaymentTermFromClient = (clientName) => {
    if (!clientName || clientName === "-") return "-";
    
    const client = clients.find(c => 
      c.clientName?.toLowerCase().trim() === clientName?.toLowerCase().trim()
    );
    
    console.log(`Matching client "${clientName}" ->`, client?.paymentTerms || "-");
    return client?.paymentTerms || "-";
  };

  // 🟢 OPTIONAL: SAFE MATCH (if you want to use includes instead)
  // const getPaymentTermFromClient = (clientName) => {
  //   if (!clientName || clientName === "-") return "-";
  //   const client = clients.find(c => 
  //     c.clientName?.toLowerCase().includes(clientName?.toLowerCase().trim())
  //   );
  //   return client?.paymentTerms || "-";
  // };

  // ✅ STEP 3: Filter ONLY Joined candidates (from clientSections status)
  const joinedCandidates = candidates.filter((c) => {
    const status = getLatestStatus(c).toLowerCase();
    return status === "joined";
  });

  // ✅ Debug: Check filtered results
  console.log("Joined candidates filtered:", joinedCandidates.length);
  joinedCandidates.forEach(c => {
    const clientName = getClientName(c);
    console.log(`Candidate: ${c.firstName} ${c.lastName}, Client: ${clientName}, Payment Term: ${getPaymentTermFromClient(clientName)}`);
  });

  // ✅ Get payout from requirements based on designation
  const getPayoutData = (designation) => {
    const requirement = requirements.find(r => r.designationPosition === designation);
    return {
      payout: requirement?.payoutCommissionRs || 0,
      percent: requirement?.payoutCommissionPercent || 0
    };
  };

  // ✅ STEP 6: CREATE TABLE DATA WITH DYNAMIC PAYMENT TERM
  const tableData = joinedCandidates.map(candidate => {
    const designation = getDesignation(candidate);
    const payoutData = getPayoutData(designation);
    const clientName = getClientName(candidate);
    const paymentTerm = getPaymentTermFromClient(clientName);
    
   const joinedDate = getJoinedDate(candidate);

return {
  id: candidate._id,
  name: `${candidate.firstName} ${candidate.lastName}`,
  designation: designation,
  clientName: clientName,
  payout: payoutData.payout,
  percent: payoutData.percent,
  term: paymentTerm,
  joinedDate: joinedDate,
  paymentDate: getPaymentDate(joinedDate, paymentTerm)   // ✅ ADD THIS
};
  });

  // ✅ Summary statistics
  const totalPayout = tableData.reduce((sum, row) => sum + row.payout, 0);
  const avgPercent = tableData.length > 0 
    ? (tableData.reduce((sum, row) => sum + row.percent, 0) / tableData.length).toFixed(2)
    : 0;

  // Helper for payment term badge
  const getPaymentTermBadge = (term) => {
    if (!term || term === "-") return "bg-gray-500/20 text-gray-400";
    
    const badges = {
      Monthly: "bg-blue-500/20 text-blue-400",
      Yearly: "bg-green-500/20 text-green-400",
      "One-time": "bg-purple-500/20 text-purple-400",
      Quarterly: "bg-orange-500/20 text-orange-400",
      "Half-Yearly": "bg-indigo-500/20 text-indigo-400"
    };
    return badges[term] || "bg-gray-500/20 text-gray-400";
  };

  return (
  <div className="min-h-screen overflow-x-hidden bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
    <div className="w-full max-w-full p-3 lg:p-5 flex flex-col">
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white tracking-tight">Candidate Payments</h1>
          <p className="text-gray-400 mt-2">
            Showing payment details for joined candidates only
          </p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total Candidates</p>
                <p className="text-2xl font-bold text-white">{candidates.length}</p>
              </div>
              <div className="w-12 h-12 bg-gray-500/20 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Joined Candidates</p>
                <p className="text-2xl font-bold text-green-400">{joinedCandidates.length}</p>
              </div>
              <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total Payout</p>
                <p className="text-2xl font-bold text-yellow-400">₹{totalPayout.toLocaleString()}</p>
              </div>
              <div className="w-12 h-12 bg-yellow-500/20 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Avg Payout %</p>
                <p className="text-2xl font-bold text-purple-400">{avgPercent}%</p>
              </div>
              <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Main Table */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600/20 to-transparent px-6 py-4 border-b border-gray-700">
            <h2 className="text-lg font-semibold text-white">
              Joined Candidates Payment Details
            </h2>
            <p className="text-sm text-gray-400 mt-1">
              Showing {tableData.length} of {joinedCandidates.length} joined candidate(s)
            </p>
          </div>
          
     <div className="overflow-x-auto overflow-y-auto max-h-[500px] w-full">
            <table className="w-full min-w-[900px] xl:min-w-full text-xs lg:text-sm">
              <thead className="bg-gray-900/95 sticky top-0 z-20 backdrop-blur-sm">
                <tr className="border-b border-gray-700">
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">#</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Candidate Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Designation</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Client</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Payout (₹)</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Payout %</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Payment Term</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Payout Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
  Joined Date
</th>
<th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
  Payment Date
</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {loading ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-12 text-center text-gray-400">
                      <div className="flex justify-center items-center gap-2">
                        <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                        Loading candidates...
                      </div>
                    </td>
                  </tr>
                ) : tableData.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-12 text-center">
                      <div className="text-gray-400">
                        <svg className="w-16 h-16 mx-auto mb-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <p className="text-lg font-medium">No joined candidates found</p>
                        <p className="text-sm mt-2">Possible reasons:</p>
                        <ul className="text-xs mt-1 space-y-1">
                          <li>• No candidates with clientStatus = "Joined" in clientSections</li>
                          <li>• Check browser console (F12) for candidate data structure</li>
                          <li>• Make sure clientSections array has clientStatus field</li>
                        </ul>
                      </div>
                    </td>
                  </tr>
                ) : (
                  tableData.map((row, index) => (
                    <tr key={row.id || index} className="hover:bg-gray-700/30 transition-all">
                      <td className="px-6 py-4 text-gray-400 font-medium">{index + 1}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                            {row.name.charAt(0)}
                          </div>
                          <span className="text-white font-medium">{row.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 bg-gray-700/50 rounded-md text-gray-300 text-sm">
                          {row.designation}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-blue-400 text-sm font-medium">
                          {row.clientName}
                        </span>
                      </td>
                      
                      <td className="px-6 py-4">
                        <span className="text-green-400 font-semibold">
                          ₹{row.payout.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-gray-700 rounded-full h-2">
                            <div 
                              className="bg-yellow-400 h-2 rounded-full transition-all" 
                              style={{ width: `${Math.min(row.percent, 100)}%` }}
                            ></div>
                          </div>
                          <span className="text-yellow-400 text-sm font-medium">{row.percent}%</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPaymentTermBadge(row.term)}`}>
                          {row.term}
                        </span>
                      </td>
                      <td className="px-6 py-4">
  <span className="text-gray-400 font-semibold">
    N/A
  </span>
</td>
                      <td className="px-6 py-4 text-sm text-gray-300">
  {row.joinedDate !== "-" 
    ? new Date(row.joinedDate).toLocaleDateString("en-IN") 
    : "-"}
</td>
<td className="px-6 py-4 text-sm text-green-400">
  {row.paymentDate !== "-" 
    ? new Date(row.paymentDate).toLocaleDateString("en-IN") 
    : "-"}
</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Footer with summary */}
          {tableData.length > 0 && (
            <div className="bg-gray-900/50 px-6 py-4 border-t border-gray-700">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                <div className="text-gray-400 text-sm">
                  Showing {tableData.length} joined candidates out of {candidates.length} total candidates
                </div>
               <div className="grid grid-cols-2 sm:flex gap-4 sm:gap-6 w-full sm:w-auto">
                  <div className="text-sm break-words">
                    <span className="text-gray-400">Total Payout: </span>
                    <span className="text-green-400 font-semibold">₹{totalPayout.toLocaleString()}</span>
                  </div>
                <div className="text-sm break-words">
                    <span className="text-gray-400">Average Payout %: </span>
                    <span className="text-yellow-400 font-semibold">{avgPercent}%</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>



    </div>
  );
};

export default RecruiterPayment;