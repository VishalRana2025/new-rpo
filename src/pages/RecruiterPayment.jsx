import React, { useState, useEffect } from "react";
import api from "../api";

const RecruiterPayment = () => {
  const [recruiters, setRecruiters] = useState([]);
  const [selectedRecruiter, setSelectedRecruiter] = useState("");
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    recruiterId: "",
    recruiterName: "",
    paymentTerm: "Monthly", // Monthly, Quarterly, Half-Yearly, Yearly, Per Candidate
    paymentAmount: "",
    paymentDate: "",
    paymentMethod: "Bank Transfer", // Bank Transfer, Cash, Cheque, UPI
    paymentStatus: "Pending", // Pending, Paid, Partially Paid, Overdue
    invoiceNumber: "",
    remarks: "",
    candidateName: "",
    candidateId: "",
    startDate: "",
    endDate: "",
    nextPaymentDate: ""
  });

  const [totalPaid, setTotalPaid] = useState(0);
  const [totalPending, setTotalPending] = useState(0);

  // Payment Term Options
  const paymentTermOptions = [
    { value: "Monthly", label: "Monthly" },
    { value: "Quarterly", label: "Quarterly (Every 3 months)" },
    { value: "Half-Yearly", label: "Half-Yearly (Every 6 months)" },
    { value: "Yearly", label: "Yearly (Annual)" },
    { value: "Per Candidate", label: "Per Candidate (Placement basis)" },
    { value: "One Time", label: "One Time Payment" },
    { value: "Custom", label: "Custom Term" }
  ];

  // Payment Method Options
  const paymentMethodOptions = [
    { value: "Bank Transfer", label: "Bank Transfer" },
    { value: "Cash", label: "Cash" },
    { value: "Cheque", label: "Cheque" },
    { value: "UPI", label: "UPI" },
    { value: "Credit Card", label: "Credit Card" },
    { value: "Debit Card", label: "Debit Card" }
  ];

  // Payment Status Options
  const paymentStatusOptions = [
    { value: "Pending", label: "Pending", color: "text-yellow-400" },
    { value: "Paid", label: "Paid", color: "text-green-400" },
    { value: "Partially Paid", label: "Partially Paid", color: "text-blue-400" },
    { value: "Overdue", label: "Overdue", color: "text-red-400" }
  ];

  useEffect(() => {
    loadRecruiters();
    loadPayments();
  }, []);

  useEffect(() => {
    calculateTotals();
  }, [payments]);

  const loadRecruiters = async () => {
    try {
      const res = await api.get("/users");
      // Filter only recruiters (employees with recruiter permissions)
      const recruiterList = res.data.filter(
        user => user.role === "employee" || user.role === "manager"
      );
      setRecruiters(recruiterList);
    } catch (err) {
      console.error("Error loading recruiters:", err);
    }
  };

  const loadPayments = async () => {
    setLoading(true);
    try {
      const res = await api.get("/recruiter-payments");
      setPayments(res.data || []);
    } catch (err) {
      console.error("Error loading payments:", err);
    } finally {
      setLoading(false);
    }
  };

  const calculateTotals = () => {
    const paid = payments
      .filter(p => p.paymentStatus === "Paid")
      .reduce((sum, p) => sum + (parseFloat(p.paymentAmount) || 0), 0);
    
    const pending = payments
      .filter(p => p.paymentStatus === "Pending" || p.paymentStatus === "Partially Paid")
      .reduce((sum, p) => sum + (parseFloat(p.paymentAmount) || 0), 0);
    
    setTotalPaid(paid);
    setTotalPending(pending);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Auto-update recruiter name when recruiterId changes
    if (name === "recruiterId") {
      const recruiter = recruiters.find(r => r._id === value);
      setFormData(prev => ({ 
        ...prev, 
        recruiterId: value,
        recruiterName: recruiter ? recruiter.name : "" 
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.recruiterId || !formData.paymentAmount) {
      alert("Please fill required fields: Recruiter and Payment Amount");
      return;
    }

    setLoading(true);
    try {
      const paymentData = {
        ...formData,
        paymentAmount: parseFloat(formData.paymentAmount),
        createdAt: new Date().toISOString()
      };

      if (formData._id) {
        // Update existing payment
        await api.put(`/recruiter-payments/${formData._id}`, paymentData);
      } else {
        // Create new payment
        await api.post("/recruiter-payments", paymentData);
      }
      
      alert("Payment saved successfully!");
      resetForm();
      loadPayments();
    } catch (err) {
      console.error("Error saving payment:", err);
      alert("Error saving payment: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      recruiterId: "",
      recruiterName: "",
      paymentTerm: "Monthly",
      paymentAmount: "",
      paymentDate: new Date().toISOString().split("T")[0],
      paymentMethod: "Bank Transfer",
      paymentStatus: "Pending",
      invoiceNumber: "",
      remarks: "",
      candidateName: "",
      candidateId: "",
      startDate: "",
      endDate: "",
      nextPaymentDate: ""
    });
    setSelectedRecruiter("");
  };

  const handleEdit = (payment) => {
    setFormData({
      ...payment,
      paymentAmount: payment.paymentAmount.toString()
    });
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this payment record?")) {
      try {
        await api.delete(`/recruiter-payments/${id}`);
        alert("Payment deleted successfully!");
        loadPayments();
      } catch (err) {
        console.error("Error deleting payment:", err);
        alert("Error deleting payment");
      }
    }
  };

  const getPaymentTermBadge = (term) => {
    const badges = {
      Monthly: "bg-blue-500/20 text-blue-400",
      Quarterly: "bg-purple-500/20 text-purple-400",
      "Half-Yearly": "bg-indigo-500/20 text-indigo-400",
      Yearly: "bg-green-500/20 text-green-400",
      "Per Candidate": "bg-yellow-500/20 text-yellow-400",
      "One Time": "bg-gray-500/20 text-gray-400",
      Custom: "bg-orange-500/20 text-orange-400"
    };
    return badges[term] || "bg-gray-500/20 text-gray-400";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="max-w-[1400px] mx-auto p-6">
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white tracking-tight">Recruiter Payment Management</h1>
          <p className="text-gray-400 mt-2">Manage recruiter payments, terms, and track payment history</p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total Paid</p>
                <p className="text-2xl font-bold text-green-400">₹{totalPaid.toLocaleString()}</p>
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
                <p className="text-gray-400 text-sm">Total Pending</p>
                <p className="text-2xl font-bold text-yellow-400">₹{totalPending.toLocaleString()}</p>
              </div>
              <div className="w-12 h-12 bg-yellow-500/20 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total Payments</p>
                <p className="text-2xl font-bold text-white">{payments.length}</p>
              </div>
              <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm6-10v4m0 0v4" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Payment Form */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 mb-8 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600/20 to-transparent px-6 py-4 border-b border-gray-700">
            <h2 className="text-lg font-semibold text-white">
              {formData._id ? "Edit Payment" : "Add New Payment"}
            </h2>
          </div>
          
          <form onSubmit={handleSubmit} className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              
              {/* Recruiter Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Select Recruiter *
                </label>
                <select
                  name="recruiterId"
                  value={formData.recruiterId}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  required
                >
                  <option value="">Select Recruiter</option>
                  {recruiters.map(recruiter => (
                    <option key={recruiter._id} value={recruiter._id}>
                      {recruiter.name} - {recruiter.employeeId || recruiter.email}
                    </option>
                  ))}
                </select>
              </div>

              {/* Payment Term */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Payment Term *
                </label>
                <select
                  name="paymentTerm"
                  value={formData.paymentTerm}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                >
                  {paymentTermOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Payment Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Payment Amount (₹) *
                </label>
                <input
                  type="number"
                  name="paymentAmount"
                  value={formData.paymentAmount}
                  onChange={handleInputChange}
                  placeholder="Enter amount"
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              {/* Payment Date */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Payment Date
                </label>
                <input
                  type="date"
                  name="paymentDate"
                  value={formData.paymentDate}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Payment Method */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Payment Method
                </label>
                <select
                  name="paymentMethod"
                  value={formData.paymentMethod}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                >
                  {paymentMethodOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Payment Status */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Payment Status
                </label>
                <select
                  name="paymentStatus"
                  value={formData.paymentStatus}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                >
                  {paymentStatusOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Invoice Number */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Invoice Number
                </label>
                <input
                  type="text"
                  name="invoiceNumber"
                  value={formData.invoiceNumber}
                  onChange={handleInputChange}
                  placeholder="INV-001"
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Candidate Name (for Per Candidate payment) */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Candidate Name
                </label>
                <input
                  type="text"
                  name="candidateName"
                  value={formData.candidateName}
                  onChange={handleInputChange}
                  placeholder="Candidate name (if per candidate payment)"
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Start Date (for contract period) */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Start Date
                </label>
                <input
                  type="date"
                  name="startDate"
                  value={formData.startDate}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* End Date (for contract period) */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  End Date
                </label>
                <input
                  type="date"
                  name="endDate"
                  value={formData.endDate}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Next Payment Date */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Next Payment Date
                </label>
                <input
                  type="date"
                  name="nextPaymentDate"
                  value={formData.nextPaymentDate}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Remarks */}
              <div className="md:col-span-2 lg:col-span-3">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Remarks
                </label>
                <textarea
                  name="remarks"
                  value={formData.remarks}
                  onChange={handleInputChange}
                  rows="3"
                  placeholder="Additional remarks or notes..."
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Form Buttons */}
            <div className="flex gap-3 mt-6 pt-4 border-t border-gray-700">
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all disabled:opacity-50"
              >
                {loading ? "Saving..." : formData._id ? "Update Payment" : "Save Payment"}
              </button>
              
              <button
                type="button"
                onClick={resetForm}
                className="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-all"
              >
                Clear Form
              </button>
            </div>
          </form>
        </div>

        {/* Payment History Table */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600/20 to-transparent px-6 py-4 border-b border-gray-700">
            <h2 className="text-lg font-semibold text-white">Payment History</h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-900/50">
                <tr className="border-b border-gray-700">
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Recruiter</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Payment Term</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Amount (₹)</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Method</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Invoice</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {payments.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="px-6 py-12 text-center text-gray-400">
                      No payment records found
                    </td>
                  </tr>
                ) : (
                  payments.map((payment, index) => (
                    <tr key={payment._id || index} className="hover:bg-gray-700/30 transition-all">
                      <td className="px-6 py-4 text-white">{payment.recruiterName}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPaymentTermBadge(payment.paymentTerm)}`}>
                          {payment.paymentTerm}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-white font-medium">₹{parseFloat(payment.paymentAmount).toLocaleString()}</td>
                      <td className="px-6 py-4 text-gray-300">{payment.paymentDate ? new Date(payment.paymentDate).toLocaleDateString() : "-"}</td>
                      <td className="px-6 py-4 text-gray-300">{payment.paymentMethod}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          payment.paymentStatus === "Paid" ? "bg-green-500/20 text-green-400" :
                          payment.paymentStatus === "Pending" ? "bg-yellow-500/20 text-yellow-400" :
                          payment.paymentStatus === "Partially Paid" ? "bg-blue-500/20 text-blue-400" :
                          "bg-red-500/20 text-red-400"
                        }`}>
                          {payment.paymentStatus}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-300">{payment.invoiceNumber || "-"}</td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEdit(payment)}
                            className="px-3 py-1 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 rounded text-xs transition-all"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(payment._id)}
                            className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded text-xs transition-all"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecruiterPayment;