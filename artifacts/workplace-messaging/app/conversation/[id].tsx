import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Image, KeyboardAvoidingView, Linking, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { getSenderColor } from '@/constants/senderColors';
import { Avatar } from '@/components/Avatar';
import { Glass } from '@/components/Glass';
import { PressableScale } from '@/components/PressableScale';
import { staff } from '@/data/mockData';
import { useApp } from '@/context/AppContext';
import { getCurrentAccessToken } from '@/context/AuthContext';
import { useColors } from '@/hooks/useColors';
import { EventResponse, FileAttachment, Message } from '@/types/app';
import { useColorScheme } from 'react-native';

const attachments: Array<{ icon: keyof typeof Ionicons.glyphMap; label: string }> = [
  { icon: 'camera-outline', label: 'Camera' },
  { icon: 'images-outline', label: 'Photo library' },
  { icon: 'document-outline', label: 'Document' },
  { icon: 'bar-chart-outline', label: 'Poll' },
  { icon: 'calendar-outline', label: 'Event' },
];

const responseLabels: Array<{ value: EventResponse; label: string }> = [
  { value: 'going', label: 'Going' },
  { value: 'maybe', label: 'Maybe' },
  { value: 'not-going', label: "Can't go" },
];

function safeAttachmentName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, '-').replace(/-+/g, '-').slice(0, 80) || 'attachment';
}

function keepAttachmentOnDevice(uri: string, name: string) {
  if (Platform.OS === 'web') return uri;
  const destination = new File(Paths.document, `${Date.now()}-${safeAttachmentName(name)}`);
  new File(uri).copy(destination);
  return destination.uri;
}

function readableFileSize(size?: number | null) {
  if (!size) return 'File attachment';
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ConversationScreen() {
  const colors = useColors();
  const isDark = useColorScheme() === 'dark';
  const { id } = useLocalSearchParams<{ id: string }>();
  const { conversations, messages, sendMessage, sendAttachment, createPoll, createEvent, votePoll, respondToEvent, isOnline, queuedMessageCount } = useApp();
  const [text, setText] = useState('');
  const [showAttachments, setShowAttachments] = useState(false);
  const [activeComposer, setActiveComposer] = useState<'poll' | 'event' | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [query, setQuery] = useState('');
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);
  const [eventTitle, setEventTitle] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventTime, setEventTime] = useState('');
  const [eventLocation, setEventLocation] = useState('');
  const [eventDetails, setEventDetails] = useState('');
  const [remoteAttachmentUris, setRemoteAttachmentUris] = useState<Record<string, string>>({});
  const conversation = conversations.find((item) => item.id === id) ?? conversations[0];
  const items = useMemo(() => (messages[conversation.id] ?? []).filter((item) => item.text.toLowerCase().includes(query.trim().toLowerCase())), [conversation.id, messages, query]);

  useEffect(() => {
    const fetchRemoteAttachments = async () => {
      const token = getCurrentAccessToken();
      if (!token) return;
      const apiBase = process.env.EXPO_PUBLIC_DOMAIN ? `https://${process.env.EXPO_PUBLIC_DOMAIN}` : '';
      for (const message of items) {
        const attachment = message.attachment;
        if (
          !attachment
          || (attachment.type !== 'image' && attachment.type !== 'document')
          || attachment.uri
          || !attachment.storagePath
          || remoteAttachmentUris[attachment.storagePath]
        ) continue;
        try {
          const response = await fetch(
            `${apiBase}/api/conversations/${encodeURIComponent(conversation.id)}/attachments?path=${encodeURIComponent(attachment.storagePath)}`,
            { headers: { Authorization: `Bearer ${token}` } },
          );
          if (!response.ok) continue;
          const file = new File(Paths.cache, `${safeAttachmentName(attachment.name)}-${Date.now()}`);
          file.write(new Uint8Array(await response.arrayBuffer()));
          setRemoteAttachmentUris((existing) => ({ ...existing, [attachment.storagePath!]: file.uri }));
        } catch {
          // The attachment remains represented by its persisted metadata and is
          // retried whenever the conversation data changes.
        }
      }
    };
    void fetchRemoteAttachments();
  }, [conversation.id, items, remoteAttachmentUris]);

  const submit = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    sendMessage(conversation.id, trimmed);
    setText('');
  };

  const openActions = (body: string) => Alert.alert('Message actions', body, [{ text: 'Reply' }, { text: 'Copy' }, { text: 'Star' }, { text: 'Cancel', style: 'cancel' }]);

  const showPermissionHelp = (title: string, canAskAgain: boolean) => {
    const message = canAskAgain
      ? `Allow access to attach a ${title.toLowerCase()} to this message.`
      : `Access is turned off for Workplace Messaging. Enable ${title.toLowerCase()} access in your device settings to attach it.`;
    const actions = !canAskAgain && Platform.OS !== 'web'
      ? [{ text: 'Cancel', style: 'cancel' as const }, { text: 'Open settings', onPress: () => { void Linking.openSettings().catch(() => Alert.alert('Unable to open settings', 'Please open your device settings and allow access.')); } }]
      : [{ text: 'OK' }];
    Alert.alert(`${title} access needed`, message, actions);
  };

  const addImageAttachment = (asset: ImagePicker.ImagePickerAsset, source: string) => {
    const name = asset.fileName ?? `${source.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.jpg`;
    const attachment: FileAttachment = {
      type: 'image',
      uri: keepAttachmentOnDevice(asset.uri, name),
      name,
      mimeType: asset.mimeType ?? 'image/jpeg',
      size: asset.fileSize,
    };
    sendAttachment(conversation.id, attachment);
  };

  const openCamera = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      showPermissionHelp('Camera', permission.canAskAgain);
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (!result.canceled && result.assets[0]) addImageAttachment(result.assets[0], 'Camera photo');
  };

  const openPhotoLibrary = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      showPermissionHelp('Photo library', permission.canAskAgain);
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (!result.canceled && result.assets[0]) addImageAttachment(result.assets[0], 'Photo');
  };

  const openDocumentPicker = async () => {
    const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true, multiple: false });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    const attachment: FileAttachment = {
      type: 'document',
      uri: keepAttachmentOnDevice(asset.uri, asset.name),
      name: asset.name,
      mimeType: asset.mimeType,
      size: asset.size,
    };
    sendAttachment(conversation.id, attachment);
  };

  const chooseAttachment = async (label: string) => {
    setShowAttachments(false);
    if (label === 'Poll' || label === 'Event') {
      setActiveComposer(label.toLowerCase() as 'poll' | 'event');
      return;
    }
    try {
      if (label === 'Camera') await openCamera();
      if (label === 'Photo library') await openPhotoLibrary();
      if (label === 'Document') await openDocumentPicker();
    } catch (error) {
      console.warn('Unable to attach file.', error);
      Alert.alert('Attachment unavailable', 'We could not add that attachment. Please try again.');
    }
  };

  const closeComposer = () => setActiveComposer(null);

  const submitPoll = () => {
    const question = pollQuestion.trim();
    const options = pollOptions.map((option) => option.trim()).filter(Boolean);
    if (!question || options.length < 2) {
      Alert.alert('Complete your poll', 'Add a question and at least two answer options.');
      return;
    }
    createPoll(conversation.id, question, options);
    setPollQuestion('');
    setPollOptions(['', '']);
    closeComposer();
  };

  const submitEvent = () => {
    const title = eventTitle.trim();
    const date = eventDate.trim();
    const time = eventTime.trim();
    if (!title || !date || !time) {
      Alert.alert('Complete your event', 'Add an event name, date, and time.');
      return;
    }
    createEvent(conversation.id, { title, date, time, location: eventLocation.trim(), details: eventDetails.trim() });
    setEventTitle('');
    setEventDate('');
    setEventTime('');
    setEventLocation('');
    setEventDetails('');
    closeComposer();
  };

  const renderAttachment = (message: Message) => {
    const attachment = message.attachment;
    if (attachment?.type === 'poll') {
      const totalVotes = attachment.options.reduce((sum, option) => sum + option.votes, 0);
      return <View style={[styles.attachmentCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.cardHeading}><View style={[styles.cardIcon, { backgroundColor: colors.secondary }]}><Ionicons name="bar-chart-outline" size={18} color={colors.primary} /></View><View><Text style={[styles.cardEyebrow, { color: colors.primary }]}>Poll</Text><Text style={[styles.cardHint, { color: colors.mutedForeground }]}>{totalVotes} {totalVotes === 1 ? 'vote' : 'votes'}</Text></View></View>
        <Text style={[styles.cardTitle, { color: colors.foreground }]}>{attachment.question}</Text>
        <View style={styles.optionList}>{attachment.options.map((option) => {
          const selected = attachment.selectedOptionId === option.id;
          const percentage = totalVotes ? Math.round((option.votes / totalVotes) * 100) : 0;
          return <PressableScale key={option.id} accessibilityLabel={`Vote for ${option.label}`} onPress={() => votePoll(message.id, option.id)} style={[styles.option, { borderColor: selected ? colors.primary : colors.border, backgroundColor: selected ? colors.secondary : colors.input }]}>
            <View style={styles.optionCopy}><Ionicons name={selected ? 'radio-button-on' : 'radio-button-off'} size={18} color={selected ? colors.primary : colors.mutedForeground} /><Text style={[styles.optionText, { color: colors.foreground }]}>{option.label}</Text><Text style={[styles.optionVotes, { color: colors.mutedForeground }]}>{option.votes}</Text></View>
            <View style={[styles.progressTrack, { backgroundColor: colors.border }]}><View style={[styles.progressFill, { width: `${percentage}%`, backgroundColor: colors.primary }]} /></View>
          </PressableScale>;
        })}</View>
        {attachment.selectedOptionId ? <Text style={[styles.selectionNote, { color: colors.primary }]}>Your vote is saved. Tap another option to change it.</Text> : null}
      </View>;
    }

    if (attachment?.type === 'event') {
      return <View style={[styles.attachmentCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.cardHeading}><View style={[styles.cardIcon, { backgroundColor: colors.secondary }]}><Ionicons name="calendar-outline" size={18} color={colors.primary} /></View><Text style={[styles.cardEyebrow, { color: colors.primary }]}>Event</Text></View>
        <Text style={[styles.cardTitle, { color: colors.foreground }]}>{attachment.title}</Text>
        <View style={styles.eventInfo}><View style={styles.infoRow}><Ionicons name="time-outline" size={16} color={colors.mutedForeground} /><Text style={[styles.infoText, { color: colors.foreground }]}>{attachment.date} · {attachment.time}</Text></View>{attachment.location ? <View style={styles.infoRow}><Ionicons name="location-outline" size={16} color={colors.mutedForeground} /><Text style={[styles.infoText, { color: colors.foreground }]}>{attachment.location}</Text></View> : null}</View>
        {attachment.details ? <Text style={[styles.eventDetails, { color: colors.mutedForeground }]}>{attachment.details}</Text> : null}
        <Text style={[styles.responseLabel, { color: colors.foreground }]}>Will you be there?</Text>
        <View style={styles.responseRow}>{responseLabels.map((response) => {
          const selected = attachment.selectedResponse === response.value;
          const count = attachment.responseCounts[response.value];
          return <PressableScale key={response.value} accessibilityLabel={`Respond ${response.label}`} onPress={() => respondToEvent(message.id, response.value)} style={[styles.responseButton, { borderColor: selected ? colors.primary : colors.border, backgroundColor: selected ? colors.secondary : colors.input }]}><Text style={[styles.responseText, { color: selected ? colors.primary : colors.foreground }]}>{response.label}</Text><Text style={[styles.responseCount, { color: colors.mutedForeground }]}>{count}</Text></PressableScale>;
        })}</View>
      </View>;
    }
    if (attachment?.type === 'image') {
      const imageUri = attachment.uri ?? (attachment.storagePath ? remoteAttachmentUris[attachment.storagePath] : undefined);
      return <View style={[styles.attachmentCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {imageUri
          ? <Image source={{ uri: imageUri }} accessibilityLabel={attachment.name} style={[styles.imageAttachment, { backgroundColor: colors.input }]} />
          : <View accessibilityLabel={`Loading ${attachment.name}`} style={[styles.imageAttachment, { backgroundColor: colors.input, alignItems: 'center', justifyContent: 'center' }]}><Ionicons name="image-outline" size={28} color={colors.mutedForeground} /></View>}
        <View style={styles.cardHeading}>
          <View style={[styles.cardIcon, { backgroundColor: colors.secondary }]}><Ionicons name="image-outline" size={18} color={colors.primary} /></View>
          <View style={styles.attachmentCopy}><Text style={[styles.cardEyebrow, { color: colors.primary }]}>Photo</Text><Text numberOfLines={1} style={[styles.cardHint, { color: colors.mutedForeground }]}>{attachment.name}</Text></View>
        </View>
      </View>;
    }
    if (attachment?.type === 'document') {
      return <View style={[styles.attachmentCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.cardHeading}>
          <View style={[styles.cardIcon, { backgroundColor: colors.secondary }]}><Ionicons name="document-text-outline" size={18} color={colors.primary} /></View>
          <View style={styles.attachmentCopy}><Text style={[styles.cardEyebrow, { color: colors.primary }]}>Document</Text><Text numberOfLines={2} style={[styles.documentName, { color: colors.foreground }]}>{attachment.name}</Text><Text style={[styles.cardHint, { color: colors.mutedForeground }]}>{readableFileSize(attachment.size)}</Text></View>
        </View>
      </View>;
    }
    return <Text style={[styles.messageText, { color: message.outgoing ? '#FFFFFF' : colors.messageText }]}>{message.text}</Text>;
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const sender = staff.find((person) => person.id === item.senderId);
    const senderName = item.outgoing ? 'You' : sender?.name ?? 'Team member';
    const isQueued = item.status === 'queued';
    const isFailed = item.status === 'failed';
    const messageColor = item.attachment || !item.outgoing ? colors.mutedForeground : 'rgba(255,255,255,0.78)';
    const statusColor = isQueued
      ? colors.statusAttention
      : isFailed
        ? colors.statusEmergency
      : item.attachment
        ? colors.mutedForeground
        : item.status === 'read'
          ? colors.statusDone
          : 'rgba(255,255,255,0.78)';
    return <View style={[styles.messageRow, item.outgoing && styles.outgoing]}>
      <Text style={[styles.senderName, { color: item.outgoing ? colors.mutedForeground : getSenderColor(item.senderId, isDark) }]}>{senderName}</Text>
      <PressableScale onLongPress={() => openActions(item.text)}>
        <View style={[styles.bubble, item.outgoing ? styles.outgoingBubble : styles.incomingBubble, { backgroundColor: item.attachment ? colors.bubbleIncoming : item.outgoing ? colors.royalBlue : colors.bubbleIncoming }]}>
          {renderAttachment(item)}
          <View style={styles.messageMeta}>
            {isQueued ? <Text style={[styles.queuedLabel, { color: colors.statusAttention }]}>Waiting for connection</Text> : null}
            {isFailed ? <Text style={[styles.queuedLabel, { color: colors.statusEmergency }]}>Could not send</Text> : null}
            <Text style={[styles.messageTime, { color: messageColor }]}>{item.time}</Text>
            {item.outgoing ? <Ionicons name={isQueued ? 'cloud-upload-outline' : isFailed ? 'alert-circle-outline' : item.status === 'read' ? 'checkmark-done' : 'checkmark'} size={14} color={statusColor} /> : null}
          </View>
        </View>
      </PressableScale>
    </View>;
  };

  return <KeyboardAvoidingView style={[styles.root, { backgroundColor: colors.background }]} behavior="padding">
    <View style={[styles.header, { borderBottomColor: colors.border }]}><View style={[styles.signature, { backgroundColor: colors.signatureEnd }]} /><View style={styles.headerRow}><PressableScale onPress={() => router.back()} accessibilityLabel="Go back"><Ionicons name="chevron-back" size={28} color={colors.foreground} /></PressableScale><Avatar label={conversation.avatar} size={40} tone={conversation.kind === 'announcement' ? 'amber' : 'teal'} /><View style={styles.headerCopy}><Text style={[styles.headerTitle, { color: colors.foreground }]}>{conversation.name}</Text><Text style={[styles.headerSub, { color: colors.mutedForeground }]}>{conversation.kind === 'announcement' ? 'Broadcast channel' : conversation.subtitle}</Text></View><PressableScale accessibilityLabel="Search conversation" onPress={() => setShowSearch((value) => !value)}><Ionicons name="search-outline" size={22} color={colors.foreground} /></PressableScale><PressableScale accessibilityLabel="Conversation information" onPress={() => conversation.kind === 'group' ? router.push('/new-chat') : Alert.alert('Conversation info', 'Shared media, profile details, and privacy settings are available here.') }><Ionicons name="ellipsis-horizontal" size={23} color={colors.foreground} /></PressableScale></View>{showSearch ? <View style={[styles.search, { backgroundColor: colors.input, borderColor: colors.border }]}><Ionicons name="search-outline" size={17} color={colors.mutedForeground} /><TextInput value={query} onChangeText={setQuery} autoFocus placeholder="Search messages" placeholderTextColor={colors.mutedForeground} style={[styles.searchInput, { color: colors.foreground }]} /><PressableScale onPress={() => { setQuery(''); setShowSearch(false); }}><Ionicons name="close-circle" size={18} color={colors.mutedForeground} /></PressableScale></View> : null}</View>
    <FlatList
      data={items}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.messages}
      keyboardDismissMode="interactive"
      keyboardShouldPersistTaps="handled"
      ListHeaderComponent={<><PressableScale onPress={() => Alert.alert('Earlier messages', 'This local preview keeps the most recent messages on-device.')} style={[styles.loadEarlier, { borderColor: colors.border }]}><Text style={[styles.loadEarlierText, { color: colors.primary }]}>Load earlier messages</Text></PressableScale><View style={styles.dateRow}><View style={[styles.dateRule, { backgroundColor: colors.border }]} /><Text style={[styles.date, { color: colors.mutedForeground }]}>Today</Text><View style={[styles.dateRule, { backgroundColor: colors.border }]} /></View></>}
      ListEmptyComponent={<Text style={[styles.empty, { color: colors.mutedForeground }]}>No messages match “{query}”.</Text>}
      renderItem={renderMessage}
    />
    {!isOnline || queuedMessageCount > 0 ? <View testID="offline-delivery-status" style={[styles.offlineBanner, { backgroundColor: colors.secondary, borderColor: colors.border }]}><Ionicons name={isOnline ? 'arrow-up-circle-outline' : 'cloud-offline-outline'} size={16} color={colors.statusAttention} /><Text style={[styles.offlineText, { color: colors.foreground }]}>{isOnline ? `Sending ${queuedMessageCount} queued ${queuedMessageCount === 1 ? 'message' : 'messages'}…` : `${queuedMessageCount ? `${queuedMessageCount} message${queuedMessageCount === 1 ? '' : 's'} queued` : 'Offline'} · messages will send when you reconnect`}</Text></View> : null}
    <Glass style={styles.composer}><PressableScale accessibilityLabel="Add attachment" onPress={() => setShowAttachments(true)}><Ionicons name="add-circle-outline" size={27} color={colors.primary} /></PressableScale><TextInput value={text} onChangeText={setText} onSubmitEditing={submit} returnKeyType="send" placeholder={conversation.kind === 'announcement' ? 'Reply to announcement' : 'Write a message'} placeholderTextColor={colors.mutedForeground} style={[styles.textInput, { color: colors.foreground }]} /><PressableScale accessibilityLabel="Send message" onPress={submit} style={[styles.send, { backgroundColor: text.trim() ? colors.royalBlue : colors.input }]}><Ionicons name="arrow-up" size={19} color={text.trim() ? '#FFFFFF' : colors.mutedForeground} /></PressableScale></Glass>
    <Modal transparent visible={showAttachments} animationType="slide" onRequestClose={() => setShowAttachments(false)}><PressableScale style={styles.backdrop} onPress={() => setShowAttachments(false)}><View /></PressableScale><View style={[styles.attachmentSheet, { backgroundColor: colors.card, borderColor: colors.border }]}><View style={[styles.handle, { backgroundColor: colors.border }]} /><Text style={[styles.sheetTitle, { color: colors.foreground }]}>Add to message</Text><View style={styles.attachmentGrid}>{attachments.map((attachment) => <PressableScale key={attachment.label} onPress={() => chooseAttachment(attachment.label)} style={styles.attachment}><View style={[styles.attachmentIcon, { backgroundColor: colors.secondary }]}><Ionicons name={attachment.icon} size={22} color={colors.primary} /></View><Text style={[styles.attachmentLabel, { color: colors.foreground }]}>{attachment.label}</Text></PressableScale>)}</View></View></Modal>
    <Modal transparent visible={activeComposer === 'poll'} animationType="slide" onRequestClose={closeComposer}><PressableScale style={styles.backdrop} onPress={closeComposer}><View /></PressableScale><KeyboardAvoidingView behavior="padding" style={styles.modalPosition}><ScrollView keyboardShouldPersistTaps="handled" style={styles.formScroll} contentContainerStyle={styles.formScrollContent}><View style={[styles.formSheet, { backgroundColor: colors.card, borderColor: colors.border }]}><View style={[styles.handle, { backgroundColor: colors.border }]} /><View style={styles.formHeader}><Text style={[styles.sheetTitle, styles.formTitle, { color: colors.foreground }]}>Create a poll</Text><PressableScale accessibilityLabel="Close poll composer" onPress={closeComposer}><Ionicons name="close" size={22} color={colors.mutedForeground} /></PressableScale></View><Text style={[styles.fieldLabel, { color: colors.foreground }]}>Question</Text><TextInput value={pollQuestion} onChangeText={setPollQuestion} placeholder="What would you like to ask?" placeholderTextColor={colors.mutedForeground} style={[styles.formInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.input }]} /><Text style={[styles.fieldLabel, { color: colors.foreground }]}>Answer options</Text>{pollOptions.map((option, index) => <View key={`poll-option-${index}`} style={styles.optionInputRow}><TextInput value={option} onChangeText={(value) => setPollOptions((current) => current.map((item, itemIndex) => itemIndex === index ? value : item))} placeholder={`Option ${index + 1}`} placeholderTextColor={colors.mutedForeground} style={[styles.formInput, styles.optionInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.input }]} />{pollOptions.length > 2 ? <PressableScale accessibilityLabel={`Remove option ${index + 1}`} onPress={() => setPollOptions((current) => current.filter((_, itemIndex) => itemIndex !== index))}><Ionicons name="remove-circle-outline" size={22} color={colors.mutedForeground} /></PressableScale> : null}</View>)}{pollOptions.length < 5 ? <PressableScale onPress={() => setPollOptions((current) => [...current, ''])} style={styles.addOption}><Ionicons name="add" size={17} color={colors.primary} /><Text style={[styles.addOptionText, { color: colors.primary }]}>Add option</Text></PressableScale> : null}<PressableScale onPress={submitPoll} style={[styles.primaryButton, { backgroundColor: colors.royalBlue }]}><Text style={styles.primaryButtonText}>Post poll</Text></PressableScale></View></ScrollView></KeyboardAvoidingView></Modal>
    <Modal transparent visible={activeComposer === 'event'} animationType="slide" onRequestClose={closeComposer}><PressableScale style={styles.backdrop} onPress={closeComposer}><View /></PressableScale><KeyboardAvoidingView behavior="padding" style={styles.modalPosition}><ScrollView keyboardShouldPersistTaps="handled" style={styles.formScroll} contentContainerStyle={styles.formScrollContent}><View style={[styles.formSheet, { backgroundColor: colors.card, borderColor: colors.border }]}><View style={[styles.handle, { backgroundColor: colors.border }]} /><View style={styles.formHeader}><Text style={[styles.sheetTitle, styles.formTitle, { color: colors.foreground }]}>Create an event</Text><PressableScale accessibilityLabel="Close event composer" onPress={closeComposer}><Ionicons name="close" size={22} color={colors.mutedForeground} /></PressableScale></View><Text style={[styles.fieldLabel, { color: colors.foreground }]}>Event name</Text><TextInput value={eventTitle} onChangeText={setEventTitle} placeholder="e.g. Staff forum" placeholderTextColor={colors.mutedForeground} style={[styles.formInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.input }]} /><View style={styles.formColumns}><View style={styles.formColumn}><Text style={[styles.fieldLabel, { color: colors.foreground }]}>Date</Text><TextInput value={eventDate} onChangeText={setEventDate} placeholder="Thu, 27 Aug" placeholderTextColor={colors.mutedForeground} style={[styles.formInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.input }]} /></View><View style={styles.formColumn}><Text style={[styles.fieldLabel, { color: colors.foreground }]}>Time</Text><TextInput value={eventTime} onChangeText={setEventTime} placeholder="10:00 AM" placeholderTextColor={colors.mutedForeground} style={[styles.formInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.input }]} /></View></View><Text style={[styles.fieldLabel, { color: colors.foreground }]}>Location <Text style={{ color: colors.mutedForeground }}>(optional)</Text></Text><TextInput value={eventLocation} onChangeText={setEventLocation} placeholder="e.g. Meeting room or video call" placeholderTextColor={colors.mutedForeground} style={[styles.formInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.input }]} /><Text style={[styles.fieldLabel, { color: colors.foreground }]}>Details <Text style={{ color: colors.mutedForeground }}>(optional)</Text></Text><TextInput value={eventDetails} onChangeText={setEventDetails} multiline placeholder="Add a short description" placeholderTextColor={colors.mutedForeground} style={[styles.formInput, styles.detailsInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.input }]} /><PressableScale onPress={submitEvent} style={[styles.primaryButton, { backgroundColor: colors.royalBlue }]}><Text style={styles.primaryButtonText}>Post event</Text></PressableScale></View></ScrollView></KeyboardAvoidingView></Modal>
  </KeyboardAvoidingView>;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingTop: 46, paddingBottom: 12, paddingHorizontal: 16, borderBottomWidth: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  signature: { height: 3, marginBottom: 10, marginHorizontal: -16 },
  headerCopy: { flex: 1 },
  headerTitle: { fontFamily: 'Inter_500Medium', fontSize: 17 },
  headerSub: { fontFamily: 'Inter_400Regular', fontSize: 12, marginTop: 2 },
  search: { minHeight: 40, marginTop: 12, borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 7 },
  searchInput: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 15 },
  messages: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 14 },
  loadEarlier: { height: 34, alignSelf: 'center', paddingHorizontal: 14, justifyContent: 'center', borderRadius: 17, borderWidth: 1, marginVertical: 10 },
  loadEarlierText: { fontFamily: 'Inter_500Medium', fontSize: 13 },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 12 },
  dateRule: { height: 1, flex: 1 },
  date: { fontFamily: 'Inter_400Regular', fontSize: 12 },
  empty: { textAlign: 'center', fontFamily: 'Inter_400Regular', fontSize: 14, paddingTop: 30 },
  messageRow: { alignItems: 'flex-start', marginBottom: 12 },
  outgoing: { alignItems: 'flex-end' },
  senderName: { fontFamily: 'Inter_500Medium', fontSize: 13, marginBottom: 4, paddingHorizontal: 4 },
  bubble: { maxWidth: '88%', paddingHorizontal: 14, paddingTop: 11, paddingBottom: 8, borderRadius: 18 },
  incomingBubble: { borderBottomLeftRadius: 4 },
  outgoingBubble: { borderBottomRightRadius: 4 },
  messageText: { fontFamily: 'Inter_400Regular', fontSize: 17, lineHeight: 25 },
  messageMeta: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 3, marginTop: 4 },
  messageTime: { fontFamily: 'Inter_400Regular', fontSize: 12 },
   queuedLabel: { fontFamily: 'Inter_500Medium', fontSize: 11, marginRight: 2 },
  attachmentCard: { borderWidth: 1, borderRadius: 13, padding: 12, minWidth: 250 },
  cardHeading: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  cardEyebrow: { fontFamily: 'Inter_500Medium', fontSize: 13 },
  cardHint: { fontFamily: 'Inter_400Regular', fontSize: 11, marginTop: 1 },
   attachmentCopy: { flex: 1 },
   documentName: { fontFamily: 'Inter_500Medium', fontSize: 15, lineHeight: 20, marginTop: 5 },
   imageAttachment: { width: 246, height: 176, borderRadius: 9 },
  cardTitle: { fontFamily: 'Inter_500Medium', fontSize: 16, lineHeight: 22, marginTop: 12 },
  optionList: { gap: 8, marginTop: 12 },
  option: { borderWidth: 1, borderRadius: 9, padding: 9 },
  optionCopy: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  optionText: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 14 },
  optionVotes: { fontFamily: 'Inter_500Medium', fontSize: 12 },
  progressTrack: { height: 3, borderRadius: 2, marginTop: 7, overflow: 'hidden' },
  progressFill: { height: 3, borderRadius: 2 },
  selectionNote: { fontFamily: 'Inter_400Regular', fontSize: 11, marginTop: 10 },
  eventInfo: { gap: 6, marginTop: 12 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  infoText: { fontFamily: 'Inter_400Regular', fontSize: 13, flex: 1 },
  eventDetails: { fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 19, marginTop: 12 },
  responseLabel: { fontFamily: 'Inter_500Medium', fontSize: 13, marginTop: 14, marginBottom: 8 },
  responseRow: { flexDirection: 'row', gap: 6 },
  responseButton: { borderWidth: 1, borderRadius: 8, minHeight: 44, paddingVertical: 7, paddingHorizontal: 8, alignItems: 'center', justifyContent: 'center', flex: 1 },
  responseText: { fontFamily: 'Inter_500Medium', fontSize: 11 },
  responseCount: { fontFamily: 'Inter_400Regular', fontSize: 11, marginTop: 2 },
  composer: { marginHorizontal: 14, marginBottom: Platform.OS === 'web' ? 34 : 14, minHeight: 54, borderRadius: 12, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, gap: 9 },
  textInput: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 16, maxHeight: 80 },
   offlineBanner: { flexDirection: 'row', alignItems: 'center', gap: 7, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, marginHorizontal: 14, marginBottom: 8 },
   offlineText: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 17 },
  send: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(9, 15, 27, 0.36)' },
  attachmentSheet: { position: 'absolute', bottom: 0, left: 0, right: 0, borderTopWidth: 1, borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingHorizontal: 20, paddingTop: 10, paddingBottom: Platform.OS === 'web' ? 28 : 38 },
  handle: { width: 38, height: 4, borderRadius: 2, alignSelf: 'center' },
  sheetTitle: { fontFamily: 'Inter_500Medium', fontSize: 17, marginTop: 16, marginBottom: 18 },
  attachmentGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  attachment: { alignItems: 'center', width: 58, gap: 7 },
  attachmentIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  attachmentLabel: { fontFamily: 'Inter_400Regular', fontSize: 11, textAlign: 'center' },
  modalPosition: { flex: 1, justifyContent: 'flex-end' },
  formScroll: { flex: 1 },
  formScrollContent: { flexGrow: 1, justifyContent: 'flex-end' },
  formSheet: { borderTopWidth: 1, borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingHorizontal: 20, paddingTop: 10, paddingBottom: Platform.OS === 'web' ? 28 : 38 },
  formHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  formTitle: { marginBottom: 16 },
  fieldLabel: { fontFamily: 'Inter_500Medium', fontSize: 13, marginBottom: 7, marginTop: 10 },
  formInput: { minHeight: 42, borderWidth: 1, borderRadius: 9, paddingHorizontal: 11, fontFamily: 'Inter_400Regular', fontSize: 14 },
  optionInputRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  optionInput: { flex: 1, marginBottom: 0 },
  addOption: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', paddingVertical: 6 },
  addOptionText: { fontFamily: 'Inter_500Medium', fontSize: 13 },
  primaryButton: { minHeight: 46, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginTop: 18 },
  primaryButtonText: { color: '#FFFFFF', fontFamily: 'Inter_500Medium', fontSize: 15 },
  formColumns: { flexDirection: 'row', gap: 10 },
  formColumn: { flex: 1 },
  detailsInput: { minHeight: 64, textAlignVertical: 'top', paddingTop: 10 },
});