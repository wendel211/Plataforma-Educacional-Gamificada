'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useRouter } from 'next/navigation';
import styled from 'styled-components';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';

const Container = styled.main`
  padding: 2rem;
`;

const Title = styled.h1`
  font-size: 2rem;
  margin-bottom: 1rem;
`;

const TopicCard = styled.div`
  background: #e9fff0;
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 1rem;
  cursor: pointer;
  transition: 0.2s;

  &:hover {
    background: #d6ffe4;
  }
`;

interface Topic {
  id: string;
  title: string;
  description: string;
}

export default function HomePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [topics, setTopics] = useState<Topic[]>([]);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    const fetchTopics = async () => {
      const snapshot = await getDocs(collection(db, 'topics'));
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Topic[];

      setTopics(data);
    };

    fetchTopics();
  }, [user]);

  const handleSelect = (topicId: string) => {
    router.push(`/topic/${topicId}`);
  };

  return (
    <Container>
      <Title>Olá, {user?.displayName || user?.email}</Title>
      <p>Escolha um tópico para começar a estudar:</p>
      {topics.map((topic) => (
        <TopicCard key={topic.id} onClick={() => handleSelect(topic.id)}>
          <strong>{topic.title}</strong>
          <p>{topic.description}</p>
        </TopicCard>
      ))}
    </Container>
  );
}
