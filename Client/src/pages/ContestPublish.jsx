import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft,
  Trophy,
  Upload,
  TestTube,
  Check,
  AlertCircle,
  Globe,
  Lock,
  Eye,
  Mail,
  Bell,
  Shield,
  FileText,
  HelpCircle,
  X,
  UserPlus,
} from 'lucide-react';

const ContestPublish = () => {
  const navigate = useNavigate();
  
  const [publishSettings, setPublishSettings] = useState({
    visibility: 'public',
    registrationRequired: true,
    emailNotifications: true,
    leaderboardPublic: true,
    allowPractice: true,
    ratingChanges: true,
    editorialPublished: false,
    
    // Test contest settings
    testContest: false,
    testers: [],
    testStartTime: '',
  });

  const [testInvites, setTestInvites] = useState('');
  const [errors, setErrors] = useState({});

  const handleSettingChange = (field, value) => {
    setPublishSettings(prev => ({
      ...prev,
      [field]: value
    }));
    // Clear error when user interacts
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

const handleAddTesters = () => {
  const input = testInvites.trim();
  if (!input) {
    setErrors(prev => ({ ...prev, testInvites: 'Please enter at least one tester email' }));
    return;
  }

  const emails = input.split(',').map(email => email.trim()).filter(email => email);
  
  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const invalidEmails = emails.filter(email => !emailRegex.test(email));
  
  if (invalidEmails.length > 0) {
    setErrors(prev => ({ ...prev, testInvites: `Invalid email(s): ${invalidEmails.join(', ')}` }));
    return;
  }

  // Add to testers array
  const newTesters = emails.map(email => ({
    id: Date.now() + Math.random(),
    email: email,
    status: 'pending'
  }));

  setPublishSettings(prev => ({
    ...prev,
    testers: [...prev.testers, ...newTesters]
  }));
  setTestInvites('');
  console.log('Adding testers:', emails);
};

const handleRemoveTester = (id) => {
  setPublishSettings(prev => ({
    ...prev,
    testers: prev.testers.filter(tester => tester.id !== id)
  }));
};

const validateTestContest = () => {
  const newErrors = {};
  
  if (publishSettings.testContest) {
    if (publishSettings.testers.length === 0) { // Changed from testInvites
      newErrors.testInvites = 'Please enter at least one tester email';
    }
    if (!publishSettings.testDuration || publishSettings.testDuration < 1) {
      newErrors.testDuration = 'Please enter a valid test duration';
    }
  }
  
  setErrors(newErrors);
  return Object.keys(newErrors).length === 0;
};

  const handlePublish = (type) => {
    if (type === 'test') {
      if (!publishSettings.testContest) {
        alert('Please enable "Test Contest" first');
        return;
      }
      
      if (!validateTestContest()) {
        return;
      }
      
      console.log('Publishing test contest:', publishSettings);
      alert('Test contest published! Testers will be notified.');
    } else {
      console.log('Publishing final contest:', publishSettings);
      alert('Contest published successfully!');
    }
    navigate('/contests');
  };

  const mockContest = {
    title: 'IUT Winter Coding Challenge',
    problems: 6,
    duration: '3 hours',
    startTime: '2023-12-15 18:00',
    participants: 0,
    type: 'Individual'
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">

        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          {/* Contest Summary */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-xs">
                <div>
                <div className="text-gray-600">Title</div>
                <div className="font-medium text-gray-900">{mockContest.title}</div>
                </div>
                <div>
                <div className="text-gray-600">Problems</div>
                <div className="font-medium text-gray-900">{mockContest.problems} problems</div>
                </div>
                <div>
                <div className="text-gray-600">Duration</div>
                <div className="font-medium text-gray-900">{mockContest.duration}</div>
                </div>
                <div>
                <div className="text-gray-600">Start Time</div>
                <div className="font-medium text-gray-900">{mockContest.startTime}</div>
                </div>
                <div>
                <div className="text-gray-600">Type</div>
                <div className="font-medium text-gray-900">{mockContest.type}</div>
                </div>
            </div>
            </div>

          {/* Test Contest Section */}
          <div className="mb-8">
            
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <div>
                  <h4 className="font-semibold text-amber-900 mb-1">Test Contest Feature</h4>
                  <p className="text-amber-800 text-xs">
                    Invite trusted users to test your contest before final publication. 
                    They can provide feedback on problem statements, test cases, and difficulty.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div>
                    <div className="font-medium text-gray-900">Enable Test Contest</div>
                    <div className="text-xs text-gray-600">Publish as test version for selected users</div>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={publishSettings.testContest}
                    onChange={(e) => handleSettingChange('testContest', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {publishSettings.testContest && (
                <div className="space-y-4 pl-8 border-l-2 border-gray-200">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-2">
                      Invite Testers ({publishSettings.testers.length} added)
                    </label>
                    
                    {/* Display added testers */}
                    {publishSettings.testers.length > 0 && (
                      <div className="mb-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                        <div className="flex flex-wrap gap-2">
                          {publishSettings.testers.map((tester) => (
                            <div
                              key={tester.id}
                              className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-full px-3 py-1"
                            >
                              <span className="text-xs font-medium text-blue-800">{tester.email}</span>
                              <button
                                type="button"
                                onClick={() => handleRemoveTester(tester.id)}
                                className="ml-1 text-blue-600 hover:text-blue-800"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Input for adding testers */}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={testInvites}
                        onChange={(e) => {
                          setTestInvites(e.target.value);
                          if (errors.testInvites) setErrors(prev => ({ ...prev, testInvites: '' }));
                        }}
                        placeholder="tester1@example.com"
                        className={`flex-1 px-3 py-2 border ${errors.testInvites ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                      />
                      <button
                        type="button"
                        onClick={handleAddTesters}
                        className="px-4 py-2 bg-blue-800 text-white rounded-lg hover:bg-blue-900 transition-colors flex items-center gap-2"
                      >
                        <UserPlus className="w-4 h-4" />
                        Add
                      </button>
                    </div>
                    {errors.testInvites && (
                      <p className="text-red-500 text-xs mt-1">{errors.testInvites}</p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-2">
                      Test Start Time
                    </label>
                    <div className="relative">
                      <input
                        type="datetime-local"
                        value={publishSettings.testStartTime}
                        onChange={(e) => handleSettingChange('testStartTime', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      <div className="mt-1 text-xs text-gray-500">
                        Testers will be able to access the contest from this time
                      </div>
                    </div>
                  </div>

                </div>
              )}
            </div>
          </div>

          {/* Visibility & Access Section */}
          <div className="mb-8">
            <h3 className="font-semibold text-gray-900 mb-4">Visibility & Access</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Globe className="w-5 h-5 text-gray-500" />
                  <div>
                    <div className="font-medium text-gray-900">Contest Visibility</div>
                    <div className="text-xs text-gray-600">Who can see and join the contest</div>
                  </div>
                </div>
                <select
                  value={publishSettings.visibility}
                  onChange={(e) => handleSettingChange('visibility', e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="public">Public</option>
                  
                  <option value="invite">Invite Only</option>
                </select>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Lock className="w-5 h-5 text-gray-500" />
                  <div>
                    <div className="font-medium text-gray-900">Registration Required</div>
                    <div className="text-xs text-gray-600">Users must register before participating</div>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={publishSettings.registrationRequired}
                    onChange={(e) => handleSettingChange('registrationRequired', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Eye className="w-5 h-5 text-gray-500" />
                  <div>
                    <div className="font-medium text-gray-900">Public Leaderboard</div>
                    <div className="text-xs text-gray-600">Show rankings to all participants</div>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={publishSettings.leaderboardPublic}
                    onChange={(e) => handleSettingChange('leaderboardPublic', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-gray-500" />
                  <div>
                    <div className="font-medium text-gray-900">Email Notifications</div>
                    <div className="text-xs text-gray-600">Send emails to registered participants</div>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={publishSettings.emailNotifications}
                    onChange={(e) => handleSettingChange('emailNotifications', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Shield className="w-5 h-5 text-gray-500" />
                  <div>
                    <div className="font-medium text-gray-900">Rating Changes</div>
                    <div className="text-xs text-gray-600">Update user ratings after contest</div>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={publishSettings.ratingChanges}
                    onChange={(e) => handleSettingChange('ratingChanges', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-gray-500" />
                  <div>
                    <div className="font-medium text-gray-900">Publish Editorial</div>
                    <div className="text-xs text-gray-600">Make solution explanations available</div>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={publishSettings.editorialPublished}
                    onChange={(e) => handleSettingChange('editorialPublished', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <HelpCircle className="w-5 h-5 text-gray-500" />
                  <div>
                    <div className="font-medium text-gray-900">Allow Practice</div>
                    <div className="text-xs text-gray-600">Users can practice after contest ends</div>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={publishSettings.allowPractice}
                    onChange={(e) => handleSettingChange('allowPractice', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>

            {/* Review warning at bottom of Visibility & Access */}
            <div className="mt-6 pt-4 border-t border-gray-200">
              <div className="flex items-center gap-2 text-xs text-amber-600">
                <AlertCircle className="w-4 h-4" />
                <span>Review all settings before publishing</span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <button></button>
            
            <div className="flex gap-3 w-full sm:w-auto">
              {publishSettings.testContest && (
                <button
                  type="button"
                  onClick={() => handlePublish('test')}
                  className="w-full sm:w-auto px-6 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors duration-200 font-semibold flex items-center gap-2"
                >
                  Publish as Test
                </button>
              )}
              
              <button
                type="button"
                onClick={() => handlePublish('final')}
                className="w-full sm:w-auto px-6 py-2 bg-blue-800 text-white rounded-lg hover:bg-blue-900 transition-colors duration-200 font-semibold flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                Publish Contest
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContestPublish;