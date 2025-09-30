import React, { useState, useEffect, useCallback, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, doc, setDoc, onSnapshot } from 'firebase/firestore';

// A robust configuration that works in Canvas and on Netlify
const firebaseConfig = (typeof window !== 'undefined' && window.__firebase_config)
  ? JSON.parse(window.__firebase_config) // Priority 1: Canvas environment
  : { // Priority 2: Netlify environment variables
      apiKey: process.env.REACT_APP_API_KEY,
      authDomain: process.env.REACT_APP_AUTH_DOMAIN,
      projectId: process.env.REACT_APP_PROJECT_ID,
      storageBucket: process.env.REACT_APP_STORAGE_BUCKET,
      messagingSenderId: process.env.REACT_APP_MESSAGING_SENDER_ID,
      appId: process.env.REACT_APP_APP_ID
    };

const appId = (typeof window !== 'undefined' && window.__app_id) 
  ? window.__app_id 
  : 'doodeurim-challenge-app';

// Initialize Firebase only if the config is valid
let app, auth, db;
if (firebaseConfig && firebaseConfig.apiKey) {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
} else {
  console.error("Firebase configuration is missing or incomplete. The app will not connect to the database.");
}

// Declarations and Prayer Topics
const declarations = [
    "나는 영적 나실인입니다!", "나는 하나님이 기뻐하시고 사랑하시는 자녀입니다!", "예수님의 온유와 겸손이 내 안에 있습니다!", "나는 하나님의 지혜로 충만합니다!", "유혹과 시험을 이겨낼 힘이 내 안에 있습니다!", "주님은 원수의 목전에서도 상을 베풀어 주십니다!", "나는 하나님 보시기에 심히 좋은 존재입니다!", "나는 하나님의 큰 그림을 믿습니다!", "세상을 이기신 주님이 내 안에 계십니다!", "나는 새사람의 정체성으로 살아갑니다!", "하나님은 든든한 내 아버지이십니다!", "나는 복된 자리에만 거하겠습니다!", "실패해도 주님을 여전히 나를 사랑하십니다!", "나는 하나님 중심으로 살아갑니다!", "급진적인 겸손이 내안에 있습니다!", "나는 약함속에서도 다시 일어섭니다!", "주님은 가장 좋은 것으로 채워주십니다!", "나는 하늘나라의 상속자입니다!", "주님은 우리 가정을 부요케 하십니다!", "나는 이미 천국열쇠를 가졌습니다!", "나는 주와 한영입니다!", "나는 어둠을 몰아내는 빛입니다", "나는 기도하고 낙심하지 않습니다!", "나는 빛 가운데 걸어가는 자녀입니다!", "내 삶의 구석마다 주님의 손길이 머물고 있습니다!", "나는 선한 영향력을 나타내는 소금입니다!", "나는 빛의 갑옷을 입었습니다!", "예수님의 권세가 나의 권세입니다!", "나는 풍성한 결실을 맺는 좋은 땅입니다!", "나는 축복의 유통자입니다!", "나는 그리스도의 향기입니다!"
];
const prayerTopics = ["담임목사님의 사역과 건강을 위해", "부목사님과 청장년 리더들을 위해", "가정의 성령충만함을 위해", "특새를 통해 큰 은혜 받기 위해", "자녀들이 영육간에 잘 성장하기 위해"];

const specialPrayerTopics = {
  21: "캄보디아 단기선교를 위해"
};

// Constants
const MAX_DECLARATION_COUNT = 5;
const challengeYear = 2025;
const challengeMonth = 9; // 0-indexed, 9 is October
const USERNAME_STORAGE_KEY_PREFIX = 'doodeurimChallenge';

// BGM URL
const bgmUrl = "https://github.com/leeeuiyoung/music-storage/raw/refs/heads/main/Shalom.mp3";

const getInitialDateStatus = () => {
    const status = {};
    for (let i = 1; i <= declarations.length; i++) {
        status[i.toString()] = { count: 0, completed: false, prayerCompleted: false };
    }
    return status;
};

// Components
function MusicPlayer({ isPlaying, onTogglePlay }) {
    const SpeakerOn = () => (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
        </svg>
    );

    const SpeakerOff = () => (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9l4 4m0-4l-4 4" />
        </svg>
    );

    return (
        <button
            onClick={onTogglePlay}
            className="fixed bottom-4 right-4 bg-teal-500/50 text-white p-3 rounded-full shadow-lg hover:bg-teal-600/70 focus:outline-none z-50 backdrop-blur-sm"
            aria-label={isPlaying ? "Mute background music" : "Play background music"}
        >
            {isPlaying ? <SpeakerOn /> : <SpeakerOff />}
        </button>
    );
}


function CalendarModal({ date, declaration, prayerTopic, onClose, onDeclare, onPray, currentCount, isCompleted, isPrayerCompleted }) {
    const handleDeclareClick = () => { if (!isCompleted) { onDeclare(); } };
    const handlePrayClick = () => { if (!isPrayerCompleted) { onPray(); } };
    const isAllComplete = isPrayerCompleted && isCompleted;
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
            <div className="bg-gray-800 p-6 sm:p-8 rounded-2xl shadow-xl w-full max-w-md text-center border-2 border-teal-400">
                <h3 className="text-lg font-bold text-teal-300 mb-2">{`${challengeYear}년 ${challengeMonth + 1}월 ${date}일`}</h3>
                <p className="text-xl font-semibold text-white mb-4">🙏 {prayerTopic}</p>
                <p className="text-2xl text-yellow-300 mb-6 leading-relaxed font-serif">"{declaration}"</p>
                <div className="flex flex-col items-center space-y-3">
                    <button onClick={handlePrayClick} disabled={isPrayerCompleted} className={`w-full px-6 py-3 text-white font-bold rounded-lg transition-transform transform hover:scale-105 ${isPrayerCompleted ? 'bg-gray-600 cursor-not-allowed' : 'bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-600 hover:to-indigo-700'}`}>
                        {isPrayerCompleted ? '기도 완료!' : '오늘의 기도'}
                    </button>
                    <button onClick={handleDeclareClick} disabled={isCompleted} className={`w-full px-6 py-3 text-white font-bold rounded-lg transition-transform transform hover:scale-105 ${isCompleted ? 'bg-gray-600 cursor-not-allowed' : 'bg-gradient-to-r from-teal-500 to-blue-600 hover:from-teal-600 hover:to-blue-700'}`}>
                        {isCompleted ? `선포 완료!` : `오늘의 선포 (${currentCount}/${MAX_DECLARATION_COUNT})`}
                    </button>
                    <button onClick={onClose} className="px-4 py-2 bg-gray-700 text-gray-300 text-sm font-semibold rounded-md hover:bg-gray-600">
                        {isAllComplete ? '기선제압 완료' : '닫기'}
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
                <button onClick={onClose} className="px-6 py-2 bg-yellow-400 text-blue-900 font-bold rounded-md hover:bg-yellow-500">
                    확인
                </button>
            </div>
        </div>
    );
}

function App() {
    const [cellNameInput, setCellNameInput] = useState('');
    const [userNameInput, setUserNameInput] = useState('');
    const [userInfo, setUserInfo] = useState(null);
    const [userId, setUserId] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [dateStatuses, setDateStatuses] = useState(getInitialDateStatus());
    const [selectedDate, setSelectedDate] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isChallengeComplete, setIsChallengeComplete] = useState(false);
    
    const [isMusicPlaying, setIsMusicPlaying] = useState(true); // Assume music will play
    const audioRef = useRef(null);

    const USERNAME_STORAGE_KEY = `${USERNAME_STORAGE_KEY_PREFIX}-userName`;
    const CELLNAME_STORAGE_KEY = `${USERNAME_STORAGE_KEY_PREFIX}-cellName`;

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

    useEffect(() => {
        if (userId && userInfo) {
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
    }, [userId, userInfo]);
    
    useEffect(() => {
        if (userInfo && audioRef.current) {
            audioRef.current.volume = 0.3;
            
            const playPromise = audioRef.current.play();
            if (playPromise !== undefined) {
                playPromise.then(() => {
                    // Autoplay started
                }).catch(error => {
                    console.log("Autoplay was prevented by the browser.");
                    setIsMusicPlaying(false);
                });
            }
        }
    }, [userInfo]);

    const toggleMusicPlay = () => {
        if (audioRef.current) {
            if (isMusicPlaying) {
                audioRef.current.pause();
                setIsMusicPlaying(false);
            } else {
                audioRef.current.play();
                setIsMusicPlaying(true);
            }
        }
    };

    const handleStartChallenge = () => {
        const trimmedUserName = userNameInput.trim();
        let formattedCellName = cellNameInput.trim();
        if (!trimmedUserName || !formattedCellName) {
            alert("셀과 이름을 모두 입력해주세요.");
            return;
        }
        
        if (!formattedCellName.endsWith('셀')) {
            formattedCellName += '셀';
        }

        localStorage.setItem(USERNAME_STORAGE_KEY, trimmedUserName);
        localStorage.setItem(CELLNAME_STORAGE_KEY, formattedCellName);
        setUserInfo({ name: trimmedUserName, cell: formattedCellName });
    };

    const isDateClickable = useCallback((day) => {
        if (!userId) return false;
        const today = new Date();
        const currentYear = today.getFullYear();
        const currentMonth = today.getMonth();
        const currentDate = today.getDate();
        if (currentYear < challengeYear || (currentYear === challengeYear && currentMonth < challengeMonth)) {
            return false;
        }
        if (currentYear === challengeYear && currentMonth === challengeMonth) {
            if (day > currentDate) {
                return false;
            }
        }
        if (day === 1) {
            return true;
        }
        const prevDayKey = (day - 1).toString();
        const prevDayStatus = dateStatuses[prevDayKey];
        return prevDayStatus && prevDayStatus.completed && prevDayStatus.prayerCompleted;
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
            const today = new Date();
            if (today.getFullYear() === challengeYear && today.getMonth() === challengeMonth && day > today.getDate()) {
                alert(`${day}일 챌린지는 아직 시작되지 않았습니다!`);
            } else {
                alert("이전 날짜의 기도와 선포를 먼저 완료해주세요!");
            }
        }
    };
    const saveDateStatusToFirestore = async (day, statusUpdate) => {
        if (!userId) return;
        const dayKey = day.toString();
        try {
            const challengeDocRef = doc(db, 'artifacts', appId, 'users', userId, 'challenge_status', `october${challengeYear}`);
            await setDoc(challengeDocRef, { [dayKey]: statusUpdate }, { merge: true });
        } catch (error) { console.error("Error saving date status:", error); }
    };
    const handleCloseModal = () => { setIsModalOpen(false); setSelectedDate(null); };
    const handleDeclare = async () => {
        if (!selectedDate || !userId) return;
        const dayKey = selectedDate.toString();
        const currentStatus = dateStatuses[dayKey];
        if (currentStatus.completed) return;
        const newCount = currentStatus.count + 1;
        const newCompleted = newCount >= MAX_DECLARATION_COUNT;
        const newStatus = { ...currentStatus, count: newCount, completed: newCompleted };
        setDateStatuses(prev => ({ ...prev, [dayKey]: newStatus }));
        await saveDateStatusToFirestore(selectedDate, newStatus);
        if (selectedDate === declarations.length && newCompleted && newStatus.prayerCompleted) {
            setTimeout(() => setIsChallengeComplete(true), 500);
        }
        if (newCompleted && currentStatus.prayerCompleted) {
            setTimeout(handleCloseModal, 300);
        }
    };
    const handlePray = async () => {
        if (!selectedDate || !userId) return;
        const dayKey = selectedDate.toString();
        const currentStatus = dateStatuses[dayKey];
        if (currentStatus.prayerCompleted) return;
        const newStatus = { ...currentStatus, prayerCompleted: true };
        setDateStatuses(prev => ({ ...prev, [dayKey]: newStatus }));
        await saveDateStatusToFirestore(selectedDate, newStatus);
        if (selectedDate === declarations.length && newStatus.completed) {
            setTimeout(() => setIsChallengeComplete(true), 500);
        }
    };
    
    const daysInOctober2025 = 31;
    const firstDayOfMonth = new Date(challengeYear, challengeMonth, 1).getDay();
    const calendarDays = [];
    for (let i = 0; i < firstDayOfMonth; i++) { calendarDays.push(<div key={`empty-start-${i}`} className="bg-gray-700/50 rounded-lg"></div>); }
    for (let day = 1; day <= daysInOctober2025; day++) {
        const dayKey = day.toString();
        const status = dateStatuses[dayKey] || { count: 0, completed: false, prayerCompleted: false };
        const isDayFullyCompleted = status.completed && status.prayerCompleted;
        const clickable = isDateClickable(day);
        calendarDays.push(
            <div key={day} className={`p-2 rounded-lg flex flex-col items-center justify-between h-24 sm:h-28 ${isDayFullyCompleted ? 'bg-teal-500/80' : 'bg-gray-800/80'} ${clickable ? 'cursor-pointer hover:bg-gray-700' : 'cursor-not-allowed opacity-60'}`} onClick={() => handleDateClick(day)}>
                <span className="text-sm sm:text-base font-bold text-white">{day}</span>
                <span className="text-[11px] text-yellow-300 font-semibold">기선제압</span>
                <div className="flex items-center justify-center space-x-1.5">
                    <div className={`w-3 h-3 rounded-full ${status.prayerCompleted ? 'bg-sky-400' : 'bg-gray-600'}`} title="기도 완료"></div>
                    <div className={`w-3 h-3 rounded-full ${status.completed ? 'bg-yellow-400' : 'bg-gray-600'}`} title="선포 완료"></div>
                </div>
            </div>
        );
    }
    const dayLabels = ['일', '월', '화', '수', '목', '금', '토'];
    
    if (!firebaseConfig || !firebaseConfig.apiKey) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4 text-white text-center" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #3b0764 100%)' }}>
                <div>
                    <h1 className="text-2xl font-bold mb-4">Firebase 설정에 문제가 있습니다.</h1>
                    <p>Netlify 환경 변수가 올바르게 설정되었는지 확인해주세요.</p>
                </div>
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
            <audio ref={audioRef} src={bgmUrl} loop preload="auto"></audio>
            
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
            
            <MusicPlayer isPlaying={isMusicPlaying} onTogglePlay={toggleMusicPlay} />
            
            {isModalOpen && selectedDate && (
                <CalendarModal
                    date={selectedDate}
                    declaration={declarations[selectedDate - 1]}
                    prayerTopic={specialPrayerTopics[selectedDate] || prayerTopics[(selectedDate - 1) % prayerTopics.length]}
                    currentCount={dateStatuses[selectedDate.toString()]?.count || 0}
                    isCompleted={dateStatuses[selectedDate.toString()]?.completed || false}
                    isPrayerCompleted={dateStatuses[selectedDate.toString()]?.prayerCompleted || false}
                    onClose={handleCloseModal}
                    onDeclare={handleDeclare}
                    onPray={handlePray}
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

