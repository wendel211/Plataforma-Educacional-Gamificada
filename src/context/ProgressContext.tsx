'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  FirestoreError,
} from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../hooks/useAuth';

interface TopicProgress {
  modulesCompleted: string[];
  points: number;
}

interface ProgressContextType {
  progressByTopic: Record<string, TopicProgress>;
  loading: boolean;
  completeModule: (
    topicId: string,
    moduleId: string,
    modulePoints?: number
  ) => Promise<void>;
  refreshProgress: () => Promise<void>;
}

const ProgressContext = createContext<ProgressContextType | undefined>(
  undefined
);

export function ProgressProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [progressByTopic, setProgressByTopic] = useState<
    Record<string, TopicProgress>
  >({});
  const [loading, setLoading] = useState(true);

  // Fetch all topic progress for this user
  const refreshProgress = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const collRef = collection(db, 'progress', user.uid, 'topics');
      const snapshot = await getDocs(collRef);
      const data: Record<string, TopicProgress> = {};
      snapshot.docs.forEach((docSnap) => {
        data[docSnap.id] = docSnap.data() as TopicProgress;
      });
      setProgressByTopic(data);
    } catch (err) {
      console.error('Erro ao buscar progresso:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      refreshProgress();
    } else {
      setProgressByTopic({});
      setLoading(false);
    }
  }, [user]);

  // Mark a module as complete, update Firestore and local state
  const completeModule = async (
    topicId: string,
    moduleId: string,
    modulePoints = 10
  ) => {
    if (!user) return;
    const docRef = doc(db, 'progress', user.uid, 'topics', topicId);

    try {
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const existing = docSnap.data() as TopicProgress;
        if (existing.modulesCompleted.includes(moduleId)) {
          return; // já concluído
        }
        const updatedModules = [...existing.modulesCompleted, moduleId];
        const updatedPoints = existing.points + modulePoints;

        await updateDoc(docRef, {
          modulesCompleted: updatedModules,
          points: updatedPoints,
        });
        setProgressByTopic((prev) => ({
          ...prev,
          [topicId]: { modulesCompleted: updatedModules, points: updatedPoints },
        }));
      } else {
        // primeiro módulo concluído neste tópico
        const initial: TopicProgress = {
          modulesCompleted: [moduleId],
          points: modulePoints,
        };
        await setDoc(docRef, initial);
        setProgressByTopic((prev) => ({
          ...prev,
          [topicId]: initial,
        }));
      }
    } catch (err) {
      console.error('Erro ao registrar conclusão de módulo:', err);
      if ((err as FirestoreError).code) {
        // lidar com erros específicos do Firestore, se necessário
      }
    }
  };

  return (
    <ProgressContext.Provider
      value={{ progressByTopic, loading, completeModule, refreshProgress }}
    >
      {children}
    </ProgressContext.Provider>
  );
}

export function useProgress() {
  const context = useContext(ProgressContext);
  if (!context) {
    throw new Error('useProgress deve ser usado dentro de um ProgressProvider');
  }
  return context;
}
