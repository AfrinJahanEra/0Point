# ZeroPoint - Competitive Programming Platform

A comprehensive competitive programming and coding practice platform designed to help developers enhance their problem-solving skills, participate in contests, and prepare for technical interviews.

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
  - [Community](#1-community)
  - [Contest System](#2-contest-system)
  - [Cross-Platform Integration](#3-cross-platform-integration)
  - [Mock Interview](#4-mock-interview)
  - [Algorithm Visualizer & Code I/O Visualizer](#5-algorithm-visualizer--code-io-visualizer)
  - [Problem Recommendation Engine](#6-problem-recommendation-engine)
  - [AI Chatbot Assistant](#7-ai-chatbot-assistant)
  - [Admin Dashboard](#8-admin-dashboard)
  - [User Dashboard & Analytics](#9-user-dashboard--analytics)
- [Tech Stack](#tech-stack)
- [Installation](#installation)
- [Project Structure](#project-structure)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

ZeroPoint is an all-in-one competitive programming platform that bridges the gap between learning algorithms and real-world coding interviews. Whether you're a beginner starting your coding journey or an experienced developer preparing for FAANG interviews, ZeroPoint provides the tools and resources you need to succeed.

---

## Features

### 1. Community

ZeroPoint fosters a vibrant community of competitive programmers and developers.

**Key Features:**
- **Blog System**: Users can create, publish, and share technical articles, tutorials, and problem-solving approaches
- **Discussion Forums**: Engage in topic-based discussions with fellow programmers
- **Problem Discussions**: Dedicated discussion threads for each problem to share solutions and approaches
- **Clarification System**: Ask and answer clarifications during contests
- **User Contributions**: Track and recognize valuable community contributions
- **Announcements**: Stay updated with platform news and important updates
- **User Profiles**: Comprehensive profiles showcasing achievements, solved problems, and activity

**Community Modules:**
- Blog posting and management
- Threaded discussions with upvotes/downvotes
- Real-time contest clarifications
- User contribution tracking and leaderboards

---

### 2. Contest System

A robust contest management system supporting various competition formats.

**Key Features:**
- **Contest Creation**: Create custom contests with configurable settings
- **Multiple Problem Types**: Support for various problem formats and difficulty levels
- **Real-Time Leaderboard**: Live rankings with WebSocket-based updates
- **Scoring Systems**: Flexible scoring including ICPC-style and IOI-style scoring
- **Contest Phases**: Automatic handling of registration, running, and ended phases
- **Editorial System**: Post-contest editorials and solutions
- **Virtual Participation**: Practice past contests in a simulated environment

**Contest Types:**
- Public contests open to all users
- Private contests with invite-only access
- Practice contests for self-assessment
- Virtual contests for past competition replay

**Contest Features:**
- Automatic time synchronization
- Penalty calculation
- Submission tracking and verdict display
- Contest-wide announcements and clarifications
- Detailed post-contest statistics

---

### 3. Cross-Platform Integration

Seamlessly integrate competitive programming profiles from multiple platforms.

**Supported Platforms:**
- **Codeforces**: Sync problems, contests, and ratings
- **LeetCode**: Import problem-solving history
- **AtCoder**: Track AtCoder performance
- **CodeChef**: Integrate CodeChef statistics
- **HackerRank**: Connect HackerRank achievements

**Integration Features:**
- **Profile Synchronization**: Automatically fetch and update statistics from linked platforms
- **Unified Analytics**: View combined performance metrics across all platforms
- **Problem Import**: Access problems from external platforms
- **Rating Tracking**: Monitor rating changes across platforms
- **Contest Calendar**: Aggregated contest schedule from all integrated platforms
- **Cross-Platform Statistics**: Compare performance across different competitive programming sites

---

### 4. Mock Interview

Comprehensive interview preparation module designed to simulate real technical interviews.

**Key Features:**
- **Timed Interview Sessions**: Practice under realistic time constraints
- **Problem Categories**: Questions organized by topics (Arrays, Trees, Graphs, DP, etc.)
- **Difficulty Levels**: Problems ranging from Easy to Hard
- **Video Conferencing**: Built-in video call support for mock interviews with peers or mentors
- **Interview Feedback**: Receive and provide feedback on interview performance
- **Company-Specific Prep**: Problems categorized by companies (Google, Amazon, Meta, etc.)

**Interview Modes:**
- Solo practice with timed challenges
- Peer-to-peer mock interviews
- Mentor-guided interview sessions
- Random problem selection based on preferences

**Features:**
- Real-time code collaboration
- Interview recording and playback
- Performance analytics and improvement tracking
- Common interview pattern recognition

---

### 5. Algorithm Visualizer & Code I/O Visualizer

Interactive visualization tools to understand algorithms and debug code execution.

**Algorithm Visualizer:**
- **Sorting Algorithms**: Visualize Bubble Sort, Merge Sort, Quick Sort, Heap Sort, and more
- **Graph Algorithms**: BFS, DFS, Dijkstra's, Bellman-Ford, Floyd-Warshall visualizations
- **Tree Traversals**: Inorder, Preorder, Postorder, Level-order animations
- **Dynamic Programming**: Step-by-step DP table construction
- **Search Algorithms**: Binary Search, Linear Search with visual representation
- **Data Structures**: Stack, Queue, Linked List, BST operations visualization

**Code I/O Visualizer:**
- **Step-by-Step Execution**: Trace code execution line by line
- **Variable Tracking**: Monitor variable values throughout execution
- **Memory Visualization**: See how memory is allocated and modified
- **Call Stack Display**: Visualize function calls and recursion
- **Input/Output Flow**: Track data flow through your program
- **Breakpoint Support**: Set breakpoints to pause execution at specific lines

**Supported Languages:**
- C++ with memory tracing
- Python with variable inspection
- Java execution visualization

**Visualization Features:**
- Speed control for animations
- Step forward/backward navigation
- Custom input support
- Export visualizations as images/GIFs

---

### 6. Problem Recommendation Engine

AI-powered problem recommendation system tailored to individual learning paths.

**Key Features:**
- **Personalized Recommendations**: Problems suggested based on your skill level and solving history
- **Difficulty Prediction**: ML-based difficulty estimation for problems
- **Weak Area Identification**: Identify topics that need more practice
- **Progressive Learning Path**: Structured problem sequences for skill development
- **Tag-Based Analysis**: Detailed breakdown of performance by problem tags

**Recommendation Algorithms:**
- Collaborative filtering based on similar users
- Content-based filtering using problem characteristics
- Hybrid recommendation combining multiple approaches
- Adaptive difficulty progression

**Analytics Provided:**
- Skill gap analysis
- Topic-wise performance metrics
- Recommended daily practice goals
- Progress tracking towards targets

---

### 7. AI Chatbot Assistant

Intelligent chatbot to assist users with coding queries and platform navigation.

**Key Features:**
- **Code Assistance**: Get help with debugging and code explanations
- **Concept Clarification**: Ask questions about algorithms and data structures
- **Problem Hints**: Request hints without revealing full solutions
- **Platform Guidance**: Navigate ZeroPoint features with chatbot assistance
- **Learning Resources**: Get recommended tutorials and resources

**Chatbot Capabilities:**
- Natural language understanding for coding queries
- Context-aware responses
- Code snippet analysis
- Multi-turn conversations
- Integration with platform features

**Use Cases:**
- "Explain how Dijkstra's algorithm works"
- "Help me debug this recursive function"
- "What's the time complexity of my solution?"
- "Recommend problems on dynamic programming"

---

### 8. Admin Dashboard

Comprehensive administrative panel for platform management and moderation.

**Key Features:**
- **User Management**:
  - View all registered users
  - Ban/unban users with reason logging
  - Role assignment (Admin, Moderator, User)
  - User activity monitoring
  
- **Banned User Management**:
  - Ban users for policy violations
  - Temporary and permanent ban options
  - Ban appeal review system
  - Ban history and audit logs
  
- **Content Moderation**:
  - Review flagged content
  - Approve/reject problem submissions
  - Moderate discussions and comments
  - Contest approval workflow

- **Platform Statistics**:
  - Total users and active users
  - Submission statistics
  - Contest participation metrics
  - Platform usage trends

**Admin Capabilities:**
- Problem creation and management
- Contest administration
- Announcement broadcasting
- Report handling and resolution
- System configuration

---

### 9. User Dashboard & Analytics

Personalized dashboard providing comprehensive insights into coding progress.

**Dashboard Components:**

**Performance Analytics:**
- Problems solved (Easy/Medium/Hard breakdown)
- Acceptance rate and success metrics
- Rating progression graphs
- Streak tracking and consistency metrics

**Activity Overview:**
- Recent submissions with verdicts
- Contest participation history
- Problems attempted vs solved ratio
- Daily/Weekly/Monthly activity heatmap

**Skill Analysis:**
- Topic-wise problem distribution
- Strongest and weakest areas
- Comparative analysis with peers
- Percentile rankings

**Progress Tracking:**
- Goal setting and tracking
- Milestone achievements
- Badge collection
- Contest rank history

**Verdict Analysis:**
- Submission verdict distribution (AC, WA, TLE, MLE, RE, CE)
- Common error patterns
- Improvement suggestions

**Calendar View:**
- Upcoming contests
- Practice schedule
- Activity history
- Important dates and deadlines

**Visual Analytics:**
- Interactive charts and graphs
- Problem difficulty distribution
- Time spent analysis
- Comparison with target metrics

---

## Tech Stack

### Frontend (Client)
- **Framework**: React.js with Vite
- **Styling**: CSS3 with modern styling
- **State Management**: React Context API
- **Routing**: React Router
- **Build Tool**: Vite
- **Deployment**: Vercel

### Backend (Server)
- **Framework**: Django (Python)
- **API**: Django REST Framework
- **Database**: SQLite (Development) / PostgreSQL (Production)
- **Real-time**: Django Channels (WebSockets)
- **Authentication**: JWT-based authentication
- **ML/AI**: Scikit-learn for recommendations and predictions

### Additional Technologies
- **Code Execution**: Docker-based sandboxed execution
- **Video Conferencing**: WebRTC integration
- **Caching**: Redis for performance optimization
- **Task Queue**: Celery for background tasks

---

## Installation

### Prerequisites
- Node.js (v16+)
- Python (v3.9+)
- pip
- Docker (for code execution)

### Client Setup

```bash
# Navigate to client directory
cd Client

# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Start development server
npm run dev
```

### Server Setup

```bash
# Navigate to server directory
cd Server

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows
venv\Scripts\activate
# Linux/Mac
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run migrations
python manage.py migrate

# Start development server
python manage.py runserver
```

---

## Project Structure

```
zeropoint/
├── Client/                    # React Frontend
│   ├── public/               # Static assets
│   ├── src/
│   │   ├── assets/          # Images, icons
│   │   ├── components/      # Reusable components
│   │   ├── context/         # React Context providers
│   │   ├── hooks/           # Custom React hooks
│   │   ├── pages/           # Page components
│   │   ├── services/        # API services
│   │   └── utils/           # Utility functions
│   └── package.json
│
├── Server/                    # Django Backend
│   ├── account/              # User authentication & profiles
│   ├── admin/                # Admin functionality
│   ├── announcement/         # Platform announcements
│   ├── blog/                 # Blog system
│   ├── Chatapp/              # AI Chatbot
│   ├── clarification/        # Contest clarifications
│   ├── compiler/             # Code compilation
│   ├── contest/              # Contest management
│   ├── contribution/         # User contributions
│   ├── crossPlatform/        # Platform integrations
│   ├── difficulty_prediction/# ML difficulty prediction
│   ├── discussion/           # Discussion forums
│   ├── executor/             # Code execution & tracing
│   ├── leaderboard/          # Ranking system
│   ├── mock_interview/       # Interview module
│   ├── notification/         # User notifications
│   ├── problem/              # Problem management
│   ├── recommendation/       # Problem recommendations
│   ├── report/               # Reporting system
│   ├── submission/           # Code submissions
│   ├── testcase/             # Test case management
│   ├── tutorial/             # Learning tutorials
│   ├── videoconference/      # Video call integration
│   └── virtual/              # Virtual contest
│
└── README.md
```

---

## Contributing

We welcome contributions from the community! Here's how you can help:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Commit your changes**: `git commit -m 'Add amazing feature'`
4. **Push to the branch**: `git push origin feature/amazing-feature`
5. **Open a Pull Request**

### Contribution Guidelines
- Follow the existing code style
- Write clear commit messages
- Add tests for new features
- Update documentation as needed

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## Support

For support, questions, or feedback:
- Open an issue on GitHub
- Join our community discussions
- Contact the development team

---

**Happy Coding!** 

*ZeroPoint - Elevate Your Competitive Programming Journey*
