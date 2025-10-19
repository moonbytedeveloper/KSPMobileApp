import React, { useState } from 'react';
import { View, Text, TextInput, ScrollView, TouchableOpacity } from 'react-native';
import theme, { COLORS, text, inputStyles, layout, SPACING, RADIUS } from './styles';

const StyleGuideDemo = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ padding: SPACING.xl, backgroundColor: COLORS.bg }}
    >
      {/* Typography */}
      <View style={[layout.card, { marginBottom: SPACING.xl }]}>
        <Text style={text.title}>Title / Heading</Text>
        <Text style={[text.subtitle, { marginTop: SPACING.sm }]}>Subtitle text example</Text>
        <Text style={[text.body, { marginTop: SPACING.md }]}>This is body text using common typography.</Text>
        <Text style={[text.muted, { marginTop: SPACING.sm }]}>Muted helper/description text</Text>
        <Text style={[text.caption, { marginTop: SPACING.sm }]}>Caption text</Text>
      </View>

      {/* Colors / Badges */}
      <View style={[layout.card, { marginBottom: SPACING.xl }]}>
        <Text style={text.subtitle}>Semantic Colors</Text>
        <View style={[layout.rowCenter, { marginTop: SPACING.md, flexWrap: 'wrap' }]}>
          {[
            { label: 'Primary', bg: COLORS.primaryLight, color: COLORS.primary },
            { label: 'Success', bg: COLORS.successBg, color: COLORS.success },
            { label: 'Warning', bg: COLORS.warningBg, color: COLORS.warning },
            { label: 'Danger', bg: COLORS.dangerBg, color: COLORS.danger },
            { label: 'Info', bg: COLORS.infoBg, color: COLORS.info },
          ].map((b) => (
            <View
              key={b.label}
              style={{
                backgroundColor: b.bg,
                paddingVertical: SPACING.xs,
                paddingHorizontal: SPACING.md,
                borderRadius: RADIUS.pill,
                marginRight: SPACING.sm,
                marginBottom: SPACING.sm,
              }}
            >
              <Text style={[text.body, { color: b.color }]}>{b.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Inputs */}
      <View style={[layout.card, { marginBottom: SPACING.xl }]}>
        <Text style={text.subtitle}>Inputs</Text>

        <View style={[inputStyles.container, { marginTop: SPACING.md }]}>
          <Text style={inputStyles.label}>Name</Text>
          <View style={inputStyles.box}>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Enter your name"
              placeholderTextColor={COLORS.textLight}
              style={inputStyles.input}
              returnKeyType="next"
            />
          </View>
          <Text style={inputStyles.helper}>Helper text goes here</Text>
        </View>

        <View style={inputStyles.container}>
          <Text style={inputStyles.label}>Email (Error)</Text>
          <View style={[inputStyles.box, inputStyles.stateError]}>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="Enter your email"
              placeholderTextColor={COLORS.textLight}
              keyboardType="email-address"
              autoCapitalize="none"
              style={inputStyles.input}
              returnKeyType="done"
            />
          </View>
          <Text style={inputStyles.errorText}>Please enter a valid email</Text>
        </View>
      </View>

      {/* Buttons */}
      <View style={[layout.card, { marginBottom: SPACING.xl }]}>
        <Text style={text.subtitle}>Buttons</Text>
        <View style={[layout.rowCenter, { marginTop: SPACING.md }]}>
          <TouchableOpacity
            activeOpacity={0.85}
            style={{
              backgroundColor: COLORS.primary,
              paddingVertical: SPACING.sm,
              paddingHorizontal: SPACING.lg,
              borderRadius: RADIUS.md,
              marginRight: SPACING.md,
            }}
          >
            <Text style={[text.body, { color: COLORS.bg, fontWeight: '700' }]}>Primary</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.85}
            style={{
              backgroundColor: COLORS.bg,
              paddingVertical: SPACING.sm,
              paddingHorizontal: SPACING.lg,
              borderRadius: RADIUS.md,
              borderWidth: 1,
              borderColor: COLORS.border,
            }}
          >
            <Text style={[text.body, { color: COLORS.text, fontWeight: '600' }]}>Secondary</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Card + Divider */}
      <View style={[layout.card, { marginBottom: SPACING.xl }]}>
        <Text style={text.subtitle}>Card + Divider</Text>
        <Text style={[text.body, { marginTop: SPACING.md }]}>First line</Text>
        <View style={[layout.divider, { marginVertical: SPACING.md }]} />
        <Text style={text.body}>Second line</Text>
      </View>
    </ScrollView>
  );
};

export default StyleGuideDemo;


