# Squad Dashboard

A live operations view for delegated work: planning, coding, review, testing, logging, and release checks moving together.

> **Author**: Syed Shujaat Ali  
> **Project**: Squad Agent Dashboard Bridge  
> **Status**: Active  

## 🎯 Quick Start

```powershell
cd c:\AiLearning.Api\squad
.\squad-dashboard-bridge\start-dashboard.ps1
```

Then open: **http://127.0.0.1:8787/dashboard**

## 📖 Documentation

- **[Dashboard Guide](squad-dashboard-bridge/DASHBOARD-GUIDE.md)** — Complete interface guide, team member roles, and troubleshooting
- **[Bridge README](squad-dashboard-bridge/README.md)** — Server setup and API documentation

## 🖼️ Dashboard Preview

<img width="1860" height="962" alt="Squad Dashboard" src="https://github.com/user-attachments/assets/6634e717-3901-4058-af7a-5c8e776b07c0" />

The dashboard displays:
- **7 Team Members** in an interactive office
- **Real-time Pipeline Stages** (Plan → Build → Security Review → Code Review → Test → Docs & DevRel → Shipped)
- **Live Activity Log** with task progression
- **Member Status** tracking (idle/working/done/blocked)

## 🚀 Features

- ✅ Real-time agent status updates
- ✅ Live pipeline visualization
- ✅ Team member activity log
- ✅ Interactive office floor
- ✅ REST API for manual updates
- ✅ Copilot CLI integration via hooks

## 📁 Project Structure

```
squad/
├── README.md                              # This file
├── squad-dashboard-bridge/                # Bridge server
│   ├── bridge-server.mjs                  # Node.js server
│   ├── DASHBOARD-GUIDE.md                 # Full documentation
│   ├── start-dashboard.ps1                # Quick-start script
│   ├── update-member.ps1                  # Status update utility
│   └── plugin/                            # Copilot CLI integration
├── agent-dashboard.html                   # Dashboard UI
├── .squad/                                # Squad team config
└── .github/                               # Automation & skills
```

## 📝 License

Created as part of the AI Learning initiative.
