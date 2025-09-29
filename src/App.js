import React, { useState, useEffect, useCallback } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, doc, setDoc, onSnapshot } from 'firebase/firestore';

// Firebase configuration - A MUCH SAFER APPROACH
// This now STRICTLY relies on the configuration provided by the Canvas environment.
const firebaseConfig = (typeof window !== 'undefined' && window.__firebase_config)
  ? JSON.parse(window.__firebase_config)
  : null;

const appId = (typeof window !== 'undefined' && window.__app_id) 
  ? window.__app_id 
  : 'doodeurim-challenge-app'; // A generic fallback for local testing

// Initialize Firebase only if the config is valid
let app, auth, db;
if (firebaseConfig) {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
} else {
  console.error("Firebase configuration not found. The app will not connect to the database.");
}


// Declarations and Prayer Topics
const declarations = [
    "나는 하나님의 사랑받는 자녀입니다", "나는 하나님의 형상입니다", "나는 하늘나라 상속자입니다", "나는 하늘나라 시민권자입니다", "나는 하나님께 시선을 두는 자녀입니다", "나는 그리스도의 심판대에서 생각합니다", "나는 하나님 보시기에 심히 좋은 존재입니다", "나는 예수님만큼 가치 있는 존재입니다", "나는 주안에서 기뻐하는 자입니다", "나는 새사람의 정체성으로 살아갑니다", "나는 감사로 문을 열어갑니다", "나는 이기며 승리하는 권세가 있습니다", "나는 말과 혀로 가정을 살리는 자입니다", "나는 그리스도와 연합된 존재입니다", "나는 삶을 인도하시는 하나님을 신뢰합니다", "나는 영혼이 잘됨 같이 범사도 잘됩니다", "나는 믿음을 선포하는 자입니다", "나는 감사로 상황을 돌파합니다", "나는 어떤 상황에서도 하나님을 찬양합니다", "나는 누구보다 존귀한 자녀입니다", "나는 예수님과 함께 걸어갑니다", "나는 어둠을 몰아내는 빛입니다", "나는 기도하며 낙심하지 않는 자입니다", "나는 빛 가운데 걸어가는 자녀입니다", "나는 기도 응답을 풍성히 누립니다", "나는 소망 가운데 인내합니다", "나는 내 생각보다 크신 하나님의 계획을 신뢰합니다", "나는 하나님의 말씀에 삶의 기준을 두는 자녀입니다", "나는 하나님의 평강을 누리는 자녀입니다", "나는 예수님처럼 용서하는 자녀입니다", "나는 가정의 영적 제사장입니다."
];
const prayerTopics = ["담임목사님을 위해", "특새를 위해", "청장년을 위해", "가정을 위해", "교회를 위해"];

// Constants
const MAX_DECLARATION_COUNT = 3;
const challengeYear = 2025;
const challengeMonth = 9; // 0-indexed, 9 is October
const USERNAME_STORAGE_KEY_PREFIX = 'doodeurimChallenge';

const getInitialDateStatus = () => {
    const status = {};
    for (let i = 1; i <= declarations.length; i++) {
        status[i.toString()] = { count: 0, completed: false };
    }
    return status;
};

// Components
function CalendarModal({ date, declaration, prayerTopic, onClose, onDeclare, currentCount, isCompleted }) {
    const handleDeclareClick = () => {
        if (!isCompleted) {
            onDeclare();
        }
    };
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
            <div className="bg-gray-800 p-6 sm:p-8 rounded-2xl shadow-xl w-full max-w-md text-center border-2 border-teal-400">
                <h3 className="text-lg font-bold text-teal-300 mb-2">{`${challengeYear}년 ${challengeMonth + 1}월 ${date}일`}</h3>
                <p className="text-xl font-semibold text-white mb-4">🙏 {prayerTopic}</p>
                <p className="text-2xl text-yellow-300 mb-6 leading-relaxed font-serif">"{declaration}"</p>
                <div className="flex flex-col items-center">
                    <button
                        onClick={handleDeclareClick}
                        disabled={isCompleted}
                        className={`w-full px-6 py-3 mb-4 text-white font-bold rounded-lg transition-transform transform hover:scale-105 ${isCompleted ? 'bg-gray-600 cursor-not-allowed' : 'bg-gradient-to-r from-teal-500 to-blue-600 hover:from-teal-600 hover:to-blue-700'}`}
                    >
                        {isCompleted ? `선포 완료!` : `기선제압! (${currentCount}/${MAX_DECLARATION_COUNT})`}
                    </button>
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-gray-700 text-gray-300 text-sm font-semibold rounded-md hover:bg-gray-600"
                    >
                        닫기
                    </button>
                </div>
            </div>
        </div>
    );
}

function FinalCompletionModal({ userName, cellName, onClose }) {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-50">
            <div className="bg-gray-800 p-8 rounded-2xl shadow-xl w-full max-w-sm text-center border-2 border-yellow-400">
                <h3 className="text-2xl font-bold text-yellow-300 mb-4">{cellName} {userName}님 축복합니다!</h3>
                <p className="text-lg text-white mb-6">기도와 선포로 계속해서 승리하세요!</p>
                <button
                    onClick={onClose}
                    className="px-6 py-2 bg-yellow-400 text-blue-900 font-bold rounded-md hover:bg-yellow-500"
                >
                    확인
                </button>
            </div>
        </div>
    );
}

function App() {
    const [cellNameInput, setCellNameInput] = useState('');
    const [userNameInput, setUserNameInput] = useState('');
    const [userInfo, setUserInfo] = useState(null); // { name: '...', cell: '...' }
    const [userId, setUserId] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [dateStatuses, setDateStatuses] = useState(getInitialDateStatus());
    const [selectedDate, setSelectedDate] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isChallengeComplete, setIsChallengeComplete] = useState(false);

    const USERNAME_STORAGE_KEY = `${USERNAME_STORAGE_KEY_PREFIX}-userName`;
    const CELLNAME_STORAGE_KEY = `${USERNAME_STORAGE_KEY_PREFIX}-cellName`;

    // 1. Authentication Effect: Runs once to establish user identity.
    useEffect(() => {
        if (!auth) {
            setIsLoading(false);
            return;
        }

        const hostToken = (typeof window !== 'undefined' && window.__initial_auth_token) ? window.__initial_auth_token : null;
        
        const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
            let finalUser = user;
            if (!finalUser) {
                try {
                    if (hostToken) {
                        const userCredential = await signInWithCustomToken(auth, hostToken);
                        finalUser = userCredential.user;
                    } else {
                        const anonUser = await signInAnonymously(auth);
                        finalUser = anonUser.user;
                    }
                } catch (error) {
                    console.error("Authentication failed:", error);
                    setIsLoading(false);
                    return;
                }
            }
            setUserId(finalUser.uid);
            
            const storedUserName = localStorage.getItem(USERNAME_STORAGE_KEY);
            const storedCellName = localStorage.getItem(CELLNAME_STORAGE_KEY);
            if (storedUserName && storedCellName) {
                setUserInfo({ name: storedUserName, cell: storedCellName });
            }
            
            setIsLoading(false);
        });
        return () => unsubscribeAuth();
    }, [USERNAME_STORAGE_KEY, CELLNAME_STORAGE_KEY]);

    // 2. Data Fetching Effect: Runs only when we have a confirmed user ID.
    useEffect(() => {
        if (userId) {
            const challengeDocRef = doc(db, 'artifacts', appId, 'users', userId, 'challenge_status', `october${challengeYear}`);

            const unsubscribeFirestore = onSnapshot(challengeDocRef, (docSnap) => {
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
            }, (error) => {
                console.error("Error fetching date statuses:", error);
                setDateStatuses(getInitialDateStatus());
            });
            return () => unsubscribeFirestore();
        }
    }, [userId]);

    const handleStartChallenge = () => {
        const trimmedUserName = userNameInput.trim();
        const trimmedCellName = cellNameInput.trim();
        if (!trimmedUserName || !trimmedCellName) {
            alert("셀과 이름을 모두 입력해주세요.");
            return;
        }
        localStorage.setItem(USERNAME_STORAGE_KEY, trimmedUserName);
        localStorage.setItem(CELLNAME_STORAGE_KEY, trimmedCellName);
        setUserInfo({ name: trimmedUserName, cell: trimmedCellName });
    };

    const isDateClickable = useCallback((day) => {
        if (!userId) return false;
        if (day === 1) return true;
        const prevDayKey = (day - 1).toString();
        const prevDayStatus = dateStatuses[prevDayKey];
        return prevDayStatus && prevDayStatus.completed;
    }, [dateStatuses, userId]);

    const handleDateClick = (day) => {
        if (!userId) {
            alert("데이터를 불러오는 중입니다. 잠시 후 다시 시도해주세요.");
            return;
        }
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
            const challengeDocRef = doc(db, 'artifacts', appId, 'users', userId, 'challenge_status', `october${challengeYear}`);
            await setDoc(challengeDocRef, { [dayKey]: statusUpdate }, { merge: true });
        } catch (error) {
            console.error("Error saving date status:", error);
        }
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedDate(null);
    };

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

        if (selectedDate === declarations.length && newCompleted) {
            setTimeout(() => setIsChallengeComplete(true), 500);
        }
        if (newCompleted) {
            setTimeout(handleCloseModal, 300);
        }
    };
    
    // Render logic
    const daysInOctober2025 = 31;
    const firstDayOfMonth = new Date(challengeYear, challengeMonth, 1).getDay();
    const calendarDays = [];

    for (let i = 0; i < firstDayOfMonth; i++) {
        calendarDays.push(<div key={`empty-start-${i}`} className="bg-gray-700/50 rounded-lg"></div>);
    }

    for (let day = 1; day <= daysInOctober2025; day++) {
        const dayKey = day.toString();
        const status = dateStatuses[dayKey] || { count: 0, completed: false };
        const isDayCompleted = status.completed;
        const clickable = isDateClickable(day);

        calendarDays.push(
            <div
                key={day}
                className={`p-2 rounded-lg flex flex-col items-center justify-between h-24 sm:h-28 
                    ${isDayCompleted ? 'bg-teal-500/80' : 'bg-gray-800/80'} 
                    ${clickable ? 'cursor-pointer hover:bg-gray-700' : 'cursor-not-allowed opacity-60'}`}
                onClick={() => handleDateClick(day)}
            >
                <span className="text-sm sm:text-base font-bold text-white">{day}</span>
                <span className="text-xs text-yellow-300 font-semibold">기선제압</span>
                <div className={`w-3 h-3 rounded-full ${isDayCompleted ? 'bg-yellow-400' : 'bg-gray-600'}`}></div>
            </div>
        );
    }

    const dayLabels = ['일', '월', '화', '수', '목', '금', '토'];

    if (!firebaseConfig) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white text-lg" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #3b0764 100%)' }}>
                Firebase 설정에 문제가 있습니다. 앱을 실행할 수 없습니다.
            </div>
        );
    }
    
    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white text-lg" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #3b0764 100%)' }}>
                앱을 준비 중입니다...
            </div>
        );
    }

    if (!userInfo) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #3b0764 100%)' }}>
                <div className="w-full max-w-sm bg-gray-800/80 backdrop-blur-sm p-8 rounded-2xl shadow-2xl text-center border border-gray-700">
                    <h1 className="text-3xl font-black text-white mb-2">두드림 청장년</h1>
                    <h2 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-teal-300 mb-6">기!선!제압 챌린지</h2>
                    <input type="text" value={cellNameInput} onChange={(e) => setCellNameInput(e.target.value)} placeholder="셀 (예: 아브라함 셀)" className="w-full px-4 py-3 mb-3 bg-gray-700 text-white border border-gray-600 rounded-lg placeholder-gray-400 focus:ring-teal-500 focus:border-teal-500"/>
                    <input type="text" value={userNameInput} onChange={(e) => setUserNameInput(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleStartChallenge()} placeholder="이름" className="w-full px-4 py-3 mb-6 bg-gray-700 text-white border border-gray-600 rounded-lg placeholder-gray-400 focus:ring-teal-500 focus:border-teal-500"/>
                    <button onClick={handleStartChallenge} className="w-full bg-gradient-to-r from-teal-500 to-blue-600 text-white font-bold py-3 rounded-lg text-lg hover:from-teal-600 hover:to-blue-700 transition-all transform hover:scale-105">챌린지 시작하기!</button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-900 text-white p-4 sm:p-6" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #3b0764 100%)' }}>
            <header className="text-center my-6 sm:my-8">
                <h1 className="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-teal-300">두드림 청장년 기!선!제압 챌린지</h1>
                <p className="text-lg text-gray-300 mt-2">{userInfo.cell} {userInfo.name}님</p>
            </header>
            <main className="bg-gray-800/50 backdrop-blur-sm p-4 sm:p-6 rounded-2xl shadow-2xl w-full max-w-3xl mx-auto border border-gray-700">
                <div className="grid grid-cols-7 gap-2 mb-2">
                    {dayLabels.map(label => (<div key={label} className="text-center font-bold text-teal-300 text-xs sm:text-sm">{label}</div>))}
                </div>
                <div className="grid grid-cols-7 gap-2">
                    {calendarDays}
                </div>
            </main>
            <footer className="mt-8 text-center text-gray-500 text-sm">
                <p>기도와 선포로 돌파하라!</p>
            </footer>
            {isModalOpen && selectedDate && (
                <CalendarModal
                    date={selectedDate}
                    declaration={declarations[selectedDate - 1]}
                    prayerTopic={prayerTopics[(selectedDate - 1) % prayerTopics.length]}
                    currentCount={dateStatuses[selectedDate.toString()]?.count || 0}
                    isCompleted={dateStatuses[selectedDate.toString()]?.completed || false}
                    onClose={handleCloseModal}
                    onDeclare={handleDeclare}
                />
            )}
            {isChallengeComplete && (
                <FinalCompletionModal 
                    userName={userInfo.name}
                    cellName={userInfo.cell}
                    onClose={() => setIsChallengeComplete(false)} 
                />
            )}
        </div>
    );
}

export default App;

