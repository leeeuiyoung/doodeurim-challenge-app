import React, { useState, useEffect, useCallback } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, doc, setDoc, onSnapshot } from 'firebase/firestore';

// Firebase configuration
const firebaseConfig = (typeof window !== 'undefined' && window.__firebase_config)
  ? JSON.parse(window.__firebase_config)
  : {
    apiKey: "AIzaSyCCGbZc4zEDgbaEhEWpg1rzCHKLQeKHthQ",
    authDomain: "iam-calendar-179e8.firebaseapp.com",
    projectId: "iam-calendar-179e8",
    storageBucket: "iam-calendar-179e8.firebasestorage.app",
    messagingSenderId: "1005875650817",
    appId: "1:1005875650817:web:d6cf5eb571af10d2053b00"
  };

const appId = (typeof window !== 'undefined' && window.__app_id) 
  ? window.__app_id 
  : 'doodeurim-youth-challenge-react-october'; // Updated app ID for the new challenge

// Initialize Firebase App
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Declarations for 31 days
const declarations = [
  "나는 하나님의 사랑받는 자녀입니다", "나는 하나님의 형상입니다", "나는 하늘나라 상속자입니다", "나는 하늘나라 시민권자입니다", "나는 하나님께 시선을 두는 자녀입니다", "나는 그리스도의 심판대에서 생각합니다", "나는 하나님 보시기에 심히 좋은 존재입니다", "나는 예수님만큼 가치 있는 존재입니다", "나는 주안에서 기뻐하는 자입니다", "나는 새사람의 정체성으로 살아갑니다", "나는 감사로 문을 열어갑니다", "나는 이기며 승리하는 권세가 있습니다", "나는 말과 혀로 가정을 살리는 자입니다", "나는 그리스도와 연합된 존재입니다", "나는 삶을 인도하시는 하나님을 신뢰합니다", "나는 영혼이 잘됨 같이 범사도 잘됩니다", "나는 믿음을 선포하는 자입니다", "나는 감사로 상황을 돌파합니다", "나는 어떤 상황에서도 하나님을 찬양합니다", "나는 누구보다 존귀한 자녀입니다", "나는 예수님과 함께 걸어갑니다", "나는 어둠을 몰아내는 빛입니다", "나는 기도하며 낙심하지 않는 자입니다", "나는 빛 가운데 걸어가는 자녀입니다", "나는 기도 응답을 풍성히 누립니다", "나는 소망 가운데 인내합니다", "나는 내 생각보다 크신 하나님의 계획을 신뢰합니다", "나는 하나님의 말씀에 삶의 기준을 두는 자녀입니다", "나는 하나님의 평강을 누리는 자녀입니다", "나는 예수님처럼 용서하는 자녀입니다", "나는 가정의 영적 제사장입니다."
];

// Prayer topics for 5-day cycle
const prayerTopics = [
  "담임목사님을 위해", // For the senior pastor
  "특새를 위해", // For the special dawn service
  "청장년을 위해", // For youth and young adults
  "가정을 위해", // For families
  "교회를 위해" // For the church (added to complete 5)
];

const MAX_DECLARATION_COUNT = 3;
const challengeYear = 2025;
const challengeMonth = 9; // 0-indexed, 9 is October
const USERNAME_STORAGE_KEY = 'doodeurimYouthChallengeUserInfoReact'; // Renamed for clarity
const CHALLENGE_ID = `october${challengeYear}`; // Unique ID for Firestore document

// Helper to get prayer topic for a given day
const getPrayerTopicForDay = (day) => {
  return prayerTopics[(day - 1) % prayerTopics.length];
};

const getInitialDateStatus = () => {
  const status = {};
  for (let i = 1; i <= declarations.length; i++) {
    // [MODIFIED] Removed youtubeViewed from the initial state
    status[i.toString()] = { count: 0, completed: false };
  }
  return status;
};

function CalendarModal({ date, declaration, prayerTopic, onClose, onDeclare, currentCount, isCompleted }) {
  const handleDeclareClick = () => { if (!isCompleted) { onDeclare(); } };
  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-50">
      <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-xl w-full max-w-md text-center border-2 border-indigo-400">
        <h3 className="text-2xl font-bold text-blue-800 mb-2">{`${challengeYear}년 ${challengeMonth + 1}월 ${date}일`}</h3>
        <p className="text-xl font-semibold text-teal-600 mb-4">기도제목: {prayerTopic}</p> {/* Display prayer topic here */}
        <p className="text-lg text-gray-800 mb-6 leading-relaxed">"{declaration}"</p>
        <div className="flex flex-col items-center">
          <button onClick={handleDeclareClick} disabled={isCompleted} className={`px-6 py-3 mb-4 text-white font-bold rounded-lg transition-all duration-300 transform hover:scale-105 ${isCompleted ? 'bg-gray-400' : 'bg-green-500 hover:bg-green-600 shadow-md'}`}>
            {isCompleted ? `선포 완료!` : `정체성 선포하기 (${currentCount}/${MAX_DECLARATION_COUNT})`}
          </button>
          <button onClick={onClose} className="px-5 py-2 bg-indigo-500 text-white font-semibold rounded-lg hover:bg-indigo-600 transition-colors">닫기</button>
        </div>
      </div>
    </div>
  );
}

function FinalCompletionModal({ userName, onClose }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center p-4 z-50">
      <div className="bg-gradient-to-br from-yellow-300 to-orange-400 p-8 rounded-3xl shadow-2xl w-full max-w-sm text-center border-4 border-white animate-bounce-in">
        <h3 className="text-3xl font-bold text-indigo-800 mb-4">{userName}님 축복합니다! 🎉</h3>
        <p className="text-xl text-gray-800 mb-6 font-semibold">
          두드림 청장년 기!선!제압 챌린지 완주를 축하합니다!
          새사람의 정체성을 선포하며 계속해서 승리하세요!
        </p>
        <button onClick={onClose} className="px-8 py-3 bg-indigo-600 text-white font-bold text-lg rounded-full shadow-lg hover:bg-indigo-700 transition-transform transform hover:scale-105">확인</button>
      </div>
    </div>
  );
}

function App() {
  const [userInfo, setUserInfo] = useState(null);
  const [isAppReady, setIsAppReady] = useState(false);
  const [userId, setUserId] = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [dateStatuses, setDateStatuses] = useState(getInitialDateStatus());
  const [selectedDate, setSelectedDate] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [cellInput, setCellInput] = useState(''); // State for cell input
  const [isChallengeComplete, setIsChallengeComplete] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState('default');

  // Notification-related useEffect
  useEffect(() => {
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
    // [FIX] Service Worker registration is causing errors in this environment.
    // The feature is temporarily disabled to allow the app to run.
    // if ('serviceWorker' in navigator) {
    //   navigator.serviceWorker.register('service-worker.js').then(registration => {
    //     console.log('Service Worker registered with scope:', registration.scope);
    //   }).catch(err => {
    //     console.error('Service Worker registration failed:', err);
    //   });
    // }
  }, []);

  // Load user name from localStorage
  useEffect(() => {
    const storedUserInfo = localStorage.getItem(USERNAME_STORAGE_KEY);
    if (storedUserInfo) {
      try {
        const parsedInfo = JSON.parse(storedUserInfo);
        if (parsedInfo && parsedInfo.name && parsedInfo.cell) {
          setUserInfo(parsedInfo);
          setIsAppReady(true);
        } else {
          setIsAppReady(false);
        }
      } catch (e) {
        localStorage.removeItem(USERNAME_STORAGE_KEY);
        setIsAppReady(false);
      }
    } else {
      setIsAppReady(false);
    }
  }, []);

  // Firebase Authentication
  useEffect(() => {
    const hostToken = (typeof window !== 'undefined' && window.__initial_auth_token) ? window.__initial_auth_token : null;
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      setIsAuthLoading(true);
      if (user) {
        setUserId(user.uid);
      } else if (hostToken) {
        try {
          const userCredential = await signInWithCustomToken(auth, hostToken);
          setUserId(userCredential.user.uid);
        } catch (error) {
          console.error("Custom token sign-in failed:", error);
          try {
            const anonUser = await signInAnonymously(auth);
            setUserId(anonUser.user.uid);
          } catch (anonError) {
            console.error("Anonymous sign-in failed:", anonError);
          }
        }
      } else {
        try {
          const anonUser = await signInAnonymously(auth);
          setUserId(anonUser.user.uid);
        } catch (error) {
          console.error("Default anonymous sign-in failed", error);
        }
      }
      setIsAuthLoading(false);
    });
    return () => unsubscribeAuth();
  }, []);

  // Firestore data loading
  useEffect(() => {
    if (userId && isAppReady) {
      // Use the updated CHALLENGE_ID for the document path
      const docRef = doc(db, `artifacts/${appId}/users/${userId}/doodeurim_challenge_status`, CHALLENGE_ID);
      const unsubscribeFirestore = onSnapshot(docRef, (docSnap) => {
        const initialStatuses = getInitialDateStatus();
        if (docSnap.exists()) {
          const firestoreData = docSnap.data();
          for (const dayKey in firestoreData) {
            if (initialStatuses.hasOwnProperty(dayKey)) {
              initialStatuses[dayKey] = { ...initialStatuses[dayKey], ...firestoreData[dayKey] };
            }
          }
        }
        setDateStatuses(initialStatuses);
      });
      return () => unsubscribeFirestore();
    }
  }, [userId, isAppReady]);

  // Schedule notifications
  const scheduleNotifications = async () => {
    if (!('serviceWorker' in navigator) || !('TimestampTrigger' in window)) {
      alert('이 브라우저에서는 알림 기능을 지원하지 않습니다.');
      return;
    }

    const registration = await navigator.serviceWorker.ready;

    // Cancel all existing notifications
    const notifications = await registration.getNotifications({ tag: 'daily-reminder' });
    notifications.forEach(notification => notification.close());

    const scheduleTime = (hour) => {
      const now = new Date();
      const target = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, 0, 0);
      if (target < now) {
        target.setDate(target.getDate() + 1);
      }
      return target.getTime();
    };

    const alarmTimes = [8, 12, 18]; // 8 AM, 12 PM, 6 PM
    alarmTimes.forEach(hour => {
      // You should ensure `window.TimestampTrigger` is correctly defined or polyfilled for this to work.
      // If it's not defined, this will throw an error.
      try {
        registration.showNotification('두드림 청장년 챌린지', {
          body: '오늘의 정체성을 선포할 시간입니다! 💪',
          icon: '/logo192.png', // Assuming you have a logo192.png in the public folder
          tag: 'daily-reminder',
          renotify: true,
          showTrigger: new window.TimestampTrigger(scheduleTime(hour)),
        });
      } catch (e) {
        console.error("Failed to schedule notification. TimestampTrigger might not be supported.", e);
        // Fallback or inform user if TimestampTrigger is not available
      }
    });
    alert('매일 오전 8시, 오후 12시, 오후 6시에 알림이 예약되었습니다!');
    setNotificationPermission('granted');
  };

  const handleRequestPermission = () => {
    if (!('Notification' in window)) {
      alert('이 브라우저에서는 알림 기능을 지원하지 않습니다.');
      return;
    }

    Notification.requestPermission().then(permission => {
      if (permission === 'granted') {
        scheduleNotifications();
      } else {
        alert('알림이 허용되지 않았습니다. 브라우저 설정에서 변경할 수 있습니다.');
      }
      setNotificationPermission(permission);
    });
  };

  const handleStartChallenge = () => {
    const name = nameInput.trim();
    const cell = cellInput.trim();
    if (!name || !cell) { 
      alert("셀과 이름을 모두 입력해주세요."); 
      return; 
    }
    const userInfoData = { name, cell };
    localStorage.setItem(USERNAME_STORAGE_KEY, JSON.stringify(userInfoData));
    setUserInfo(userInfoData);
    setIsAppReady(true);
  };

  const isDateClickable = useCallback((day) => {
    if (!userId) return false;
    if (day === 1) return true;
    const prevDayKey = (day - 1).toString();
    const prevDayStatus = dateStatuses[prevDayKey];
    // [MODIFIED] Removed youtubeViewed check
    return prevDayStatus && prevDayStatus.completed;
  }, [dateStatuses, userId]);

  const handleDateClick = (day) => {
    if (!userId) { alert("데이터를 불러오는 중입니다. 잠시 후 다시 시도해주세요."); return; }
    if (isDateClickable(day) && day > 0 && day <= declarations.length) {
      setSelectedDate(day);
      setIsModalOpen(true);
    } else if (day > 0 && day <= declarations.length) {
      alert("이전 날짜의 선포를 먼저 완료해주세요!");
    }
  };

  const saveDateStatusToFirestore = async (day, statusUpdate) => {
    if (!userId) return;
    const dayKey = day.toString();
    try {
      // Use the updated CHALLENGE_ID for the document path
      const docRef = doc(db, `artifacts/${appId}/users/${userId}/doodeurim_challenge_status`, CHALLENGE_ID);
      await setDoc(docRef, { [dayKey]: statusUpdate }, { merge: true });
    } catch (error) { console.error("Error saving date status:", error); }
  };

  const handleCloseModal = () => { setIsModalOpen(false); setSelectedDate(null); };

  const handleDeclare = async () => {
    if (!selectedDate || !userId) return;
    const dayKey = selectedDate.toString();
    const currentStatus = dateStatuses[dayKey] || getInitialDateStatus()[dayKey];
    if (currentStatus.completed) return;
    const newCount = currentStatus.count + 1;
    const newCompleted = newCount >= MAX_DECLARATION_COUNT;
    const newStatus = { ...currentStatus, count: newCount, completed: newCompleted };
    setDateStatuses(prevStatuses => ({ ...prevStatuses, [dayKey]: newStatus }));
    await saveDateStatusToFirestore(selectedDate, newStatus);
    
    // [MODIFIED] Removed youtubeViewed check for final completion
    if (selectedDate === declarations.length && newCompleted) {
      setTimeout(() => setIsChallengeComplete(true), 500);
    }
    if (newCompleted) { setTimeout(handleCloseModal, 300); }
  };

  // Calendar rendering logic
  const daysInOctober2025 = 31; // October has 31 days
  const firstDayOfMonth = new Date(challengeYear, challengeMonth, 1).getDay(); // 0 for Sunday, 1 for Monday...
  const calendarDays = [];

  // Fill leading empty days
  for (let i = 0; i < firstDayOfMonth; i++) {
    calendarDays.push(<div key={`empty-start-${i}`} className="border border-gray-700 p-1 h-24 sm:h-28 bg-gray-900 bg-opacity-30"></div>);
  }

  // Fill actual days
  for (let day = 1; day <= daysInOctober2025; day++) {
    const dayKey = day.toString();
    const status = dateStatuses[dayKey] || { count: 0, completed: false };
    // [MODIFIED] isDayFullyCompleted only depends on 'completed' status now
    const isDayFullyCompleted = status.completed;
    const clickable = isDateClickable(day);

    calendarDays.push(
      <div
        key={day}
        className={`relative border border-gray-700 p-1 h-24 sm:h-28 flex flex-col items-center justify-center transition-all duration-200
          ${isDayFullyCompleted ? 'bg-gradient-to-br from-green-500 to-teal-600 shadow-lg' : 'bg-gray-800 bg-opacity-70'}
          ${clickable ? 'cursor-pointer hover:bg-gray-700 hover:bg-opacity-90' : 'cursor-not-allowed opacity-70'}
        `}
        onClick={() => handleDateClick(day)}
      >
        <span className={`absolute top-1 left-2 text-sm sm:text-base font-bold ${isDayFullyCompleted ? 'text-white' : 'text-gray-300'}`}>{day}</span>
        <div className="text-sm text-yellow-300 font-semibold mt-2 px-1 text-center leading-tight">
            기선제압
        </div>
        {/* [REMOVED] YouTube icon button */}
        <div className="flex items-center justify-center space-x-1.5 h-7 mt-2">
          {/* [MODIFIED] Only one status dot for declaration */}
          <div className={`w-3 h-3 rounded-full ${status.completed ? 'bg-green-400' : 'bg-gray-500'}`}></div>
        </div>
      </div>
    );
  }
  const dayLabels = ['주일', '월', '화', '수', '목', '금', '토'];

  if (!isAppReady) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 flex items-center justify-center p-4 font-['Inter',_sans-serif]">
        <div className="w-full max-w-md bg-gray-900 bg-opacity-90 p-8 rounded-3xl shadow-2xl text-center border-t-4 border-l-4 border-teal-400 animate-fade-in">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-teal-400 mb-2 drop-shadow-lg">두드림 청장년</h1>
          <h2 className="text-4xl sm:text-5xl font-extrabold text-yellow-400 mb-4 drop-shadow-lg leading-tight">기선제압</h2>
          <p className="text-gray-300 text-lg mb-6">기도와 선포로 돌파하라</p>
          <input
            type="text"
            value={cellInput}
            onChange={(e) => setCellInput(e.target.value)}
            placeholder="셀을 입력하세요 (예: 기드온셀)"
            className="w-full px-5 py-3 mb-4 bg-gray-700 text-white border border-gray-600 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
          <input
            type="text"
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleStartChallenge()}
            placeholder="이름을 입력하세요"
            className="w-full px-5 py-3 mb-6 bg-gray-700 text-white border border-gray-600 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
          <button
            onClick={handleStartChallenge}
            className="w-full bg-yellow-500 hover:bg-yellow-600 text-blue-900 font-bold py-3 rounded-lg shadow-xl text-xl tracking-wide transition-all duration-300 transform hover:scale-105"
          >
            챌린지 시작하기!
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 flex flex-col items-center p-4 sm:p-6 font-['Inter',_sans-serif]">
      <header className="text-center my-6 sm:my-8 w-full">
        <h1 className="text-4xl sm:text-5xl font-extrabold text-teal-400 drop-shadow-lg">두드림 청장년</h1>
        <h2 className="text-5xl sm:text-6xl font-extrabold text-yellow-400 drop-shadow-lg leading-tight mt-2">기선제압</h2>
        <div className="inline-block mt-3 bg-white bg-opacity-20 px-4 py-2 rounded-lg backdrop-blur-sm">
          {/* [MODIFIED] Text changed to remove '찬양' */}
          <p className="text-lg sm:text-xl text-white font-semibold">10월 한 달 동안 매일 기도 & 선포</p>
          {userInfo && <p className="text-md sm:text-lg text-gray-200 mt-1">({userInfo.cell} {userInfo.name}님)</p>}
          {userId && <p className="text-xs text-gray-400 mt-1 break-all">User ID: {userId}</p>} {/* Display User ID */}
        </div>
        {/* [FIX] The notification button is temporarily disabled due to the Service Worker error. */}
        {/* {notificationPermission !== 'granted' && (
          <div className="mt-6">
            <button
              onClick={handleRequestPermission}
              className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-full shadow-lg text-lg transition-all duration-300 transform hover:scale-105"
            >
              ⏰ 선포 시간 알림 받기
            </button>
          </div>
        )} */}
      </header>

      <main className="bg-gray-900 bg-opacity-90 p-4 sm:p-6 rounded-3xl shadow-2xl w-full max-w-2xl lg:max-w-3xl border-t-4 border-l-4 border-teal-400">
        <div className="grid grid-cols-7 gap-px bg-gray-700 border border-gray-700 rounded-t-lg overflow-hidden">
          {dayLabels.map(label => (
            <div key={label} className="bg-blue-700 text-white text-sm sm:text-base font-bold text-center py-3 border-r border-gray-700 last:border-r-0">
              {label}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-px bg-gray-700 border-x border-b border-gray-700 rounded-b-lg overflow-hidden">
          {calendarDays}
        </div>
      </main>

      {isModalOpen && selectedDate && (
        <CalendarModal
          date={selectedDate}
          declaration={declarations[selectedDate - 1]}
          prayerTopic={getPrayerTopicForDay(selectedDate)} // Pass the prayer topic
          currentCount={dateStatuses[selectedDate.toString()]?.count || 0}
          isCompleted={dateStatuses[selectedDate.toString()]?.completed || false}
          onClose={handleCloseModal}
          onDeclare={handleDeclare}
        />
      )}
      {isChallengeComplete && (
        <FinalCompletionModal userName={userInfo?.name} onClose={() => setIsChallengeComplete(false)} />
      )}

      <footer className="mt-8 sm:mt-10 text-center">
        <p className="text-xs sm:text-sm text-white opacity-75">매일의 정체성 선포를 통해 믿음의 용사로 굳건히 서세요!</p>
      </footer>
    </div>
  );
}

export default App;

