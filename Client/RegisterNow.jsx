import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { 
  ArrowLeft, 
  FileText, 
  Check, 
  AlertCircle,
  Clock,
  Calendar,
  Users,
  Trophy
} from 'lucide-react';

const RegisterNow = () => {
  const { contestId } = useParams();
  const [contestData, setContestData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);

  // Fetch contest data from backend
  useEffect(() => {
    const fetchContest = async () => {
      try {
        const res = await fetch(`http://localhost:8000/contests/${contestId}/`);
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        const data = await res.json();
        setContestData(data);
      } catch (err) {
        console.error('Failed to fetch contest:', err);
        setContestData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchContest();
  }, [contestId]);

  const handleRegister = async () => {
    if (!acceptedTerms) return;
    setIsRegistering(true);

    try {
      const res = await fetch(`http://localhost:8000/contests/${contestId}/register/`, {
        method: 'POST',
        headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${localStorage.getItem('token')}`
      },
      });

      const data = await res.json();

      if (res.ok || data.message === "Already registered") {
        setRegistrationSuccess(true);
      } else {
        alert(data.error || data.message || "Failed to register");
      }
    } catch (err) {
      console.error(err);
      alert("An error occurred while registering. Try again.");
    } finally {
      setIsRegistering(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span>Loading contest details...</span>
      </div>
    );
  }

  if (!contestData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span>Contest not found.</span>
      </div>
    );
  }

  if (registrationSuccess) {
  // Instead of showing a success page, redirect to contests
  window.location.href = '/contests';
  // Or if you want to use navigate:
  // navigate('/contests');
  
  // Show a loading message while redirecting
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Check className="w-8 h-8 text-green-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Registration Successful!</h2>
        <p className="text-gray-600">Redirecting to contests page...</p>
      </div>
    </div>
  );
}
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg border border-gray-200">
              {/* Contest Info */}
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-700 rounded-lg flex items-center justify-center text-white">
                    <Trophy className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-xl font-bold text-gray-900 mb-2">{contestData.title}</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span>Start: {new Date(contestData.start_time).toLocaleString()}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        <span>Duration: {contestData.duration_minutes} minutes</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        <span>Type: {contestData.type}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        <span>{contestData.participants} participants</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Terms and Conditions */}
              <div className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <FileText className="w-5 h-5 text-gray-700" />
                  <h3 className="text-lg font-semibold text-gray-900">Terms and Conditions</h3>
                </div>

                <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto mb-6 text-sm text-gray-700">
                  <p>All contest rules, submission guidelines, scoring, and conduct apply.</p>
                  {/* You can expand this section with more rules */}
                  <ul className="list-disc pl-5 mt-2 space-y-1">
    <li>Each participant must submit their solution before the deadline.</li>
    <li>Plagiarism is strictly prohibited. Any violation results in disqualification.</li>
    <li>Submissions should follow the problem statement format exactly.</li>
    <li>Participants are expected to follow the code of conduct.</li>
    <li>Scores are final and cannot be disputed after the contest ends.</li>
  </ul>
                </div>

                <div className="flex items-start gap-3 mb-6">
                  <input
                    type="checkbox"
                    id="terms-agreement"
                    checked={acceptedTerms}
                    onChange={(e) => setAcceptedTerms(e.target.checked)}
                    className="mt-1 w-4 h-4 text-blue-800 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                  />
                  <label htmlFor="terms-agreement" className="text-sm text-gray-700">
                    I have read and agree to the terms and conditions.
                  </label>
                </div>

                <button
                  onClick={handleRegister}
                  disabled={!acceptedTerms || isRegistering}
                  className={`w-full py-3 px-4 rounded-lg font-semibold transition-colors duration-200 flex items-center justify-center gap-2 ${
                    acceptedTerms && !isRegistering
                      ? 'bg-blue-800 text-white hover:bg-blue-900'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {isRegistering ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Registering...
                    </>
                  ) : (
                    'Register for Contest'
                  )}
                </button>

                {!acceptedTerms && (
                  <div className="flex items-center gap-2 mt-3 text-sm text-amber-600">
                    <AlertCircle className="w-4 h-4" />
                    <span>You must accept the terms and conditions to register</span>
                  </div>
                )}
              </div>
            </div>
          </div>


        </div>
      </div>
    </div>
  );
};

export default RegisterNow;
