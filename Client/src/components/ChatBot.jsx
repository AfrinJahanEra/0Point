// components/Chatbot.jsx
import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, X, Send, Bot, User, Minimize2, Maximize2, History, Trash2 } from 'lucide-react';

const Chatbot = () => {

  // Sample responses for common questions
  const botResponses = {
    greetings: ["Hello! 👋", "Hi there!", "Hey! How can I assist you?"],
    contest: [
      "You can find ongoing contests in the 'Live Now' tab. Past contests are in 'Past' tab.",
      "To register for a contest, click the 'Register' button on the contest card.",
      "Contest problems are available once the contest starts. Check the contest page for details."
    ],
    problems: [
      "Problems are listed in the contest page. Click on any problem to view and solve it.",
      "You can filter problems by difficulty using the filter options.",
      "Need help with a specific problem? Try checking the editorial after the contest ends."
    ],
    submissions: [
      "View your submissions in the 'Submissions' tab inside a contest.",
      "Submission status shows as Accepted, Wrong Answer, Time Limit Exceeded, etc.",
      "You can resubmit solutions if you encounter errors."
    ],
    leaderboard: [
      "Leaderboard shows real-time rankings during live contests.",
      "Points are awarded based on problem difficulty and submission time.",
      "Your rating changes based on contest performance."
    ],
    help: [
      "Check our FAQ section for common questions.",
      "Contact support at support@contestplatform.com for specific issues.",
      "Join our community Discord for real-time help."
    ],
    default: [
      "I'm not sure about that. Could you rephrase?",
      "Let me check that for you...",
      "That's an interesting question! Let me find the best answer."
    ]
  };
};

export default Chatbot;

