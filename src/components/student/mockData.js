// Mock data for student dashboard when API is unavailable
export const mockStudentData = {
  name: "Demo Student",
  username: "student123",
  email: "student@example.com",
  phoneNumber: "9876543210",
  batch: "Vedant",
  class: "Class X",
  dateOfAdmission: new Date(2023, 8, 1)
};

export const mockStats = {
  attendanceRate: 92,
  upcomingTests: 3,
  completedAssignments: 12,
  averageScore: 87
};

export const mockRecentNotes = [
  {
    title: "Physics Formula Sheet",
    subject: "Physics",
    author: { name: "Dr. Sharma" },
    createdAt: new Date(2023, 9, 5),
    fileUrl: "#"
  },
  {
    title: "Organic Chemistry Notes",
    subject: "Chemistry",
    author: { name: "Mrs. Gupta" },
    createdAt: new Date(2023, 9, 2),
    fileUrl: "#"
  }
];

export const mockRecentTestScores = [
  {
    testName: "Unit Test 2",
    subject: "Mathematics",
    score: 85,
    maxScore: 100,
    date: new Date(2023, 9, 1)
  },
  {
    testName: "Quiz 5",
    subject: "Physics",
    score: 18,
    maxScore: 20,
    date: new Date(2023, 8, 28)
  }
];

export const mockRecentAttendance = [
  {
    status: "present",
    date: new Date(2023, 9, 6)
  },
  {
    status: "present",
    date: new Date(2023, 9, 5)
  },
  {
    status: "absent",
    date: new Date(2023, 9, 4)
  }
];

export const mockUpcomingClasses = [
  {
    subject: "Mathematics",
    teacher: "Mr. Verma",
    location: "Room 101",
    scheduledAt: new Date(Date.now() + 86400000) // Tomorrow
  },
  {
    subject: "Physics",
    teacher: "Dr. Sharma",
    location: "Room 102",
    scheduledAt: new Date(Date.now() + 172800000) // Day after tomorrow
  }
]; 