import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Button from '../components/Button';
import Card from '../components/Card';
import { colors } from '../theme/colors';
import theme from '../theme/theme';
import { LinearGradient } from 'expo-linear-gradient';

const UIKitScreen = () => {
  // Define gradients as tuples to satisfy type requirements
  const primaryGradient: [string, string] = [colors.primary.main, colors.primary.light];
  const accent1Gradient: [string, string] = [colors.accent1, colors.primary.main];
  const accent2Gradient: [string, string] = [colors.accent2, colors.info];
  const accent3Gradient: [string, string] = [colors.accent3, colors.success];
  const backgroundGradient: [string, string] = [colors.background.dark, colors.background.card];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>NIURA UI Kit</Text>
        
        {/* Showcase the new color palette */}
        <Card variant="elevated" style={styles.section}>
          <Text style={styles.sectionTitle}>Color Palette</Text>
          <View style={styles.colorGrid}>
            {/* Primary colors */}
            <View style={styles.colorRow}>
              <View style={[styles.colorBox, { backgroundColor: colors.primary.main }]}>
                <Text style={styles.colorLabel}>Primary</Text>
              </View>
              <View style={[styles.colorBox, { backgroundColor: colors.primary.light }]}>
                <Text style={styles.colorLabel}>Primary Light</Text>
              </View>
            </View>
            
            {/* Status colors */}
            <View style={styles.colorRow}>
              <View style={[styles.colorBox, { backgroundColor: colors.success }]}>
                <Text style={styles.colorLabel}>Success</Text>
              </View>
              <View style={[styles.colorBox, { backgroundColor: colors.error }]}>
                <Text style={styles.colorLabel}>Error</Text>
              </View>
              <View style={[styles.colorBox, { backgroundColor: colors.warning }]}>
                <Text style={styles.colorLabel}>Warning</Text>
              </View>
            </View>
            
            {/* Accent colors */}
            <View style={styles.colorRow}>
              <View style={[styles.colorBox, { backgroundColor: colors.accent1 }]}>
                <Text style={styles.colorLabel}>Accent 1</Text>
              </View>
              <View style={[styles.colorBox, { backgroundColor: colors.accent2 }]}>
                <Text style={styles.colorLabel}>Accent 2</Text>
              </View>
              <View style={[styles.colorBox, { backgroundColor: colors.accent3 }]}>
                <Text style={styles.colorLabel}>Accent 3</Text>
              </View>
            </View>
          </View>
        </Card>
        
        {/* Buttons */}
        <Card variant="elevated" style={styles.section}>
          <Text style={styles.sectionTitle}>Buttons</Text>
          
          <Text style={styles.subTitle}>Variants</Text>
          <View style={styles.componentRow}>
            <Button title="Filled" variant="filled" />
            <Button title="Outlined" variant="outlined" />
            <Button title="Ghost" variant="ghost" />
          </View>
          
          <Text style={styles.subTitle}>Sizes</Text>
          <View style={styles.componentColumn}>
            <Button title="Small" size="small" />
            <View style={styles.spacerSmall} />
            <Button title="Medium" size="medium" />
            <View style={styles.spacerSmall} />
            <Button title="Large" size="large" />
          </View>
          
          <Text style={styles.subTitle}>Colors</Text>
          <View style={styles.componentColumn}>
            <Button title="Primary" color="primary" />
            <View style={styles.spacerSmall} />
            <Button title="Success" color="success" />
            <View style={styles.spacerSmall} />
            <Button title="Error" color="error" />
            <View style={styles.spacerSmall} />
            <Button title="Warning" color="warning" />
            <View style={styles.spacerSmall} />
            <Button title="Accent 1" color="accent1" />
            <View style={styles.spacerSmall} />
            <Button title="Accent 2" color="accent2" />
            <View style={styles.spacerSmall} />
            <Button title="Accent 3" color="accent3" />
          </View>
          
          <Text style={styles.subTitle}>With Icons</Text>
          <View style={styles.componentColumn}>
            <Button 
              title="Left Icon" 
              icon={<Ionicons name="star" size={16} color={colors.common.white} />} 
              iconPosition="left" 
            />
            <View style={styles.spacerSmall} />
            <Button 
              title="Right Icon" 
              icon={<Ionicons name="arrow-forward" size={16} color={colors.common.white} />} 
              iconPosition="right" 
            />
          </View>
          
          <Text style={styles.subTitle}>States</Text>
          <View style={styles.componentColumn}>
            <Button title="Loading" loading={true} />
            <View style={styles.spacerSmall} />
            <Button title="Full Width" fullWidth />
          </View>
        </Card>
        
        {/* Cards */}
        <Card variant="elevated" style={styles.section}>
          <Text style={styles.sectionTitle}>Cards</Text>
          
          <Text style={styles.subTitle}>Variants</Text>
          <View style={styles.componentColumn}>
            <Card variant="filled" style={styles.demoCard}>
              <Text style={styles.cardTitle}>Filled Card</Text>
              <Text style={styles.cardText}>This is a filled card with the new theme.</Text>
            </Card>
            <View style={styles.spacerMedium} />
            
            <Card variant="outlined" style={styles.demoCard}>
              <Text style={styles.cardTitle}>Outlined Card</Text>
              <Text style={styles.cardText}>This is an outlined card with the new theme.</Text>
            </Card>
            <View style={styles.spacerMedium} />
            
            <Card variant="elevated" style={styles.demoCard}>
              <Text style={styles.cardTitle}>Elevated Card</Text>
              <Text style={styles.cardText}>This is an elevated card with shadow.</Text>
            </Card>
          </View>
          
          <Text style={styles.subTitle}>Sizes</Text>
          <View style={styles.componentColumn}>
            <Card variant="filled" size="small" style={styles.demoCard}>
              <Text style={styles.cardTitle}>Small Card</Text>
            </Card>
            <View style={styles.spacerMedium} />
            
            <Card variant="filled" size="medium" style={styles.demoCard}>
              <Text style={styles.cardTitle}>Medium Card</Text>
            </Card>
            <View style={styles.spacerMedium} />
            
            <Card variant="filled" size="large" style={styles.demoCard}>
              <Text style={styles.cardTitle}>Large Card</Text>
            </Card>
          </View>
        </Card>
        
        {/* Gradients */}
        <Card variant="elevated" style={styles.section}>
          <Text style={styles.sectionTitle}>Gradients</Text>
          
          <View style={styles.componentColumn}>
            <LinearGradient
              colors={primaryGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.gradientBox}
            >
              <Text style={styles.gradientText}>Primary Gradient</Text>
            </LinearGradient>
            <View style={styles.spacerMedium} />
            
            <LinearGradient
              colors={accent1Gradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.gradientBox}
            >
              <Text style={styles.gradientText}>Accent 1 Gradient</Text>
            </LinearGradient>
            <View style={styles.spacerMedium} />
            
            <LinearGradient
              colors={accent2Gradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.gradientBox}
            >
              <Text style={styles.gradientText}>Accent 2 Gradient</Text>
            </LinearGradient>
            <View style={styles.spacerMedium} />
            
            <LinearGradient
              colors={accent3Gradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.gradientBox}
            >
              <Text style={styles.gradientText}>Accent 3 Gradient</Text>
            </LinearGradient>
            <View style={styles.spacerMedium} />
            
            <LinearGradient
              colors={backgroundGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.gradientBox}
            >
              <Text style={styles.gradientText}>Background Gradient</Text>
            </LinearGradient>
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.dark,
  },
  scrollContent: {
    padding: theme.spacing.md,
  },
  title: {
    fontSize: theme.fontSizes.xxxl,
    fontWeight: theme.fontWeights.bold as any,
    color: colors.text.primary,
    marginBottom: theme.spacing.lg,
    textAlign: 'center',
  },
  section: {
    marginBottom: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: theme.fontSizes.xl,
    fontWeight: theme.fontWeights.semibold as any,
    color: colors.text.primary,
    marginBottom: theme.spacing.md,
  },
  subTitle: {
    fontSize: theme.fontSizes.md,
    fontWeight: theme.fontWeights.medium as any,
    color: colors.text.secondary,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  colorGrid: {
    gap: theme.spacing.sm,
  },
  colorRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  colorBox: {
    flex: 1,
    height: 80,
    borderRadius: theme.borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorLabel: {
    color: colors.common.white,
    fontSize: theme.fontSizes.sm,
    fontWeight: theme.fontWeights.medium as any,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  componentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  componentColumn: {
    gap: theme.spacing.sm,
  },
  spacerSmall: {
    height: theme.spacing.xs,
  },
  spacerMedium: {
    height: theme.spacing.sm,
  },
  demoCard: {
    minHeight: 80,
  },
  cardTitle: {
    fontSize: theme.fontSizes.md,
    fontWeight: theme.fontWeights.semibold as any,
    color: colors.text.primary,
    marginBottom: theme.spacing.xs,
  },
  cardText: {
    fontSize: theme.fontSizes.sm,
    color: colors.text.secondary,
  },
  gradientBox: {
    height: 80,
    borderRadius: theme.borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gradientText: {
    color: colors.common.white,
    fontSize: theme.fontSizes.md,
    fontWeight: theme.fontWeights.semibold as any,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
});

export default UIKitScreen; 