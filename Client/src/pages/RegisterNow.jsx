import React, { useState } from 'react';
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
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);

  // Mock contest data - replace with actual API call
  const contestData = {
    id: contestId || '1',
    title: "IUT Winter Coding Challenge",
    platform: "IUT Platform",
    startTime: "Dec 15, 2023 • 18:00",
    duration: "3 hours",
    type: "Individual",
    participants: "500+ registered",
    difficulty: "Medium"
  };

  const handleRegister = async () => {
    if (!acceptedTerms) return;
    
    setIsRegistering(true);
    // Simulate API call
    setTimeout(() => {
      setIsRegistering(false);
      setRegistrationSuccess(true);
    }, 1500);
  };

  if (registrationSuccess) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-2xl mx-auto px-4">
          <div className="bg-white rounded-lg border border-green-200 p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Registration Successful!</h1>
            <p className="text-gray-600 mb-6">
              You have successfully registered for <strong>{contestData.title}</strong>
            </p>
            <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
              <h3 className="font-semibold text-gray-900 mb-2">Contest Details</h3>
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>Starts: {contestData.startTime}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span>Duration: {contestData.duration}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  <span>Type: {contestData.type}</span>
                </div>
              </div>
            </div>
            <div className="flex gap-3 justify-center">
              <Link 
                to="/contests" 
                className="bg-blue-800 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-900 transition-colors duration-200"
              >
                Back to Contests
              </Link>
              <Link 
                to="/" 
                className="border border-gray-300 text-gray-700 px-6 py-3 rounded-lg font-semibold hover:bg-gray-50 transition-colors duration-200"
              >
                Go to Home
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="mb-6">
          <Link 
            to="/contests" 
            className="inline-flex items-center gap-2 text-blue-800 hover:text-blue-900 font-medium mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Contests
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Contest Registration</h1>
        </div>

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
                        <span>Start: {contestData.startTime}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        <span>Duration: {contestData.duration}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        <span>Type: {contestData.type}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        <span>{contestData.participants}</span>
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

                <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto mb-6">
                  <div className="space-y-4 text-sm text-gray-700">
                    <section>
                      <h4 className="font-semibold text-gray-900 mb-2">1. Contest Rules</h4>
                      <ul className="list-disc list-inside space-y-1 ml-2">
                        <li>All participants must adhere to the code of conduct</li>
                        <li>Any form of cheating will result in immediate disqualification</li>
                        <li>Participants must solve problems individually unless specified as a team contest</li>
                        <li>Sharing solutions during the contest is strictly prohibited</li>
                      </ul>
                    </section>

                    <section>
                      <h4 className="font-semibold text-gray-900 mb-2">2. Submission Guidelines</h4>
                      <ul className="list-disc list-inside space-y-1 ml-2">
                        <li>Solutions must be submitted before the contest ends</li>
                        <li>Multiple submissions are allowed with penalty for incorrect attempts</li>
                        <li>Final submission for each problem will be considered for scoring</li>
                        <li>Code must be original and written during the contest</li>
                      </ul>
                    </section>

                    <section>
                      <h4 className="font-semibold text-gray-900 mb-2">3. Scoring and Ranking</h4>
                      <ul className="list-disc list-inside space-y-1 ml-2">
                        <li>Problems are scored based on difficulty and submission time</li>
                        <li>Rankings are determined by total points and time penalty</li>
                        <li>Ties are broken by submission time of last correct solution</li>
                        <li>Final rankings will be published after system testing</li>
                      </ul>
                    </section>

                    <section>
                      <h4 className="font-semibold text-gray-900 mb-2">4. Code of Conduct</h4>
                      <ul className="list-disc list-inside space-y-1 ml-2">
                        <li>Be respectful to other participants and organizers</li>
                        <li>Do not engage in any form of harassment or discrimination</li>
                        <li>Follow platform-specific rules and guidelines</li>
                        <li>Report any suspicious activity to contest organizers</li>
                      </ul>
                    </section>

                    <section>
                      <h4 className="font-semibold text-gray-900 mb-2">5. Privacy and Data</h4>
                      <ul className="list-disc list-inside space-y-1 ml-2">
                        <li>Your submissions and performance data may be used for research</li>
                        <li>Personal information will be handled according to our privacy policy</li>
                        <li>Contest results may be publicly displayed on leaderboards</li>
                        <li>You can request data deletion according to platform policies</li>
                      </ul>
                    </section>

                    <section>
                      <h4 className="font-semibold text-gray-900 mb-2">6. Disqualification</h4>
                      <p className="ml-2">
                        The organizers reserve the right to disqualify any participant who violates 
                        these terms or engages in unethical behavior. Decisions made by the contest 
                        organizers are final.
                      </p>
                    </section>
                  </div>
                </div>

                {/* Agreement Checkbox */}
                <div className="flex items-start gap-3 mb-6">
                  <input
                    type="checkbox"
                    id="terms-agreement"
                    checked={acceptedTerms}
                    onChange={(e) => setAcceptedTerms(e.target.checked)}
                    className="mt-1 w-4 h-4 text-blue-800 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                  />
                  <label htmlFor="terms-agreement" className="text-sm text-gray-700">
                    I have read and agree to the terms and conditions above. I understand that 
                    violating any of these rules may result in disqualification from this contest 
                    and future contests on the platform.
                  </label>
                </div>

                {/* Register Button */}
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

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Important Notes */}
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h3 className="font-semibold text-gray-900 mb-3">Important Notes</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start gap-2">
                  <div className="w-4 h-4 bg-blue-100 rounded-full flex items-center justify-center mt-0.5 flex-shrink-0">
                    <span className="text-xs text-blue-800">1</span>
                  </div>
                  <span>Ensure stable internet connection during contest</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-4 h-4 bg-blue-100 rounded-full flex items-center justify-center mt-0.5 flex-shrink-0">
                    <span className="text-xs text-blue-800">2</span>
                  </div>
                  <span>Test your development environment beforehand</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-4 h-4 bg-blue-100 rounded-full flex items-center justify-center mt-0.5 flex-shrink-0">
                    <span className="text-xs text-blue-800">3</span>
                  </div>
                  <span>Join 15 minutes early to avoid last-minute issues</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-4 h-4 bg-blue-100 rounded-full flex items-center justify-center mt-0.5 flex-shrink-0">
                    <span className="text-xs text-blue-800">4</span>
                  </div>
                  <span>Read all problem statements carefully</span>
                </li>
              </ul>
            </div>

            {/* Need Help */}
            <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
              <h3 className="font-semibold text-blue-900 mb-2">Need Help?</h3>
              <p className="text-sm text-blue-800 mb-3">
                If you have any questions about the contest or registration process, 
                please contact our support team.
              </p>
              <button className="w-full bg-white text-blue-800 py-2 rounded text-sm font-semibold hover:bg-blue-100 transition-colors duration-200 border border-blue-300">
                Contact Support
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterNow;