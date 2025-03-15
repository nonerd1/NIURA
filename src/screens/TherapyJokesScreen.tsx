import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../theme/colors';

// Array of therapy jokes
const therapyJokes = [
  "Why did the therapist bring a ladder to work? To help their clients get over things!",
  "What did one therapist say to another therapist? 'We need to talk about our feelings about talking about feelings.'",
  "Why don't therapists like Twitter? Too many characters with issues!",
  "What did the CBT therapist say to the coffee? 'You need to think less negatively about your grounds.'",
  "Why did the mindfulness therapist bring a broken clock to session? To help clients live in the present!",
  "What's a therapist's favorite movie? 'Inside Out'!",
  "Why did the therapist go to the art gallery? For some art therapy!",
  "What did the therapist say to the procrastinator? 'Let's talk about it... now!'",
  "Why don't therapists play hide and seek? Because good relationships are about being present!",
  "What's a therapist's favorite exercise? Running through emotions!"
];

const TherapyJokesScreen = () => {
  const navigation = useNavigation();
  const [currentJoke, setCurrentJoke] = useState(therapyJokes[Math.floor(Math.random() * therapyJokes.length)]);

  const getNewJoke = () => {
    let newJoke;
    do {
      newJoke = therapyJokes[Math.floor(Math.random() * therapyJokes.length)];
    } while (newJoke === currentJoke); // Ensure we don't get the same joke twice
    setCurrentJoke(newJoke);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={colors.text.primary} />
          <Text style={styles.backText}>Back</Text>
        </Pressable>
        <Text style={styles.title}>Therapy Jokes</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.jokeCard}>
          <Text style={styles.jokeText}>{currentJoke}</Text>
          <Pressable onPress={getNewJoke} style={styles.refreshButton}>
            <Ionicons name="refresh" size={24} color={colors.primary.main} />
            <Text style={styles.refreshText}>New Joke</Text>
          </Pressable>
        </View>

        <Text style={styles.disclaimer}>
          Note: These jokes are meant to bring a smile to your face. Remember, therapy is a serious and valuable tool for mental health.
        </Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.dark,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  backText: {
    color: colors.text.primary,
    fontSize: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text.primary,
    marginLeft: 8,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  jokeCard: {
    backgroundColor: colors.background.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
  },
  jokeText: {
    fontSize: 18,
    color: colors.text.primary,
    textAlign: 'center',
    lineHeight: 28,
    marginBottom: 24,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.dark,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  refreshText: {
    color: colors.primary.main,
    fontSize: 16,
    marginLeft: 8,
  },
  disclaimer: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 24,
  },
});

export default TherapyJokesScreen; 