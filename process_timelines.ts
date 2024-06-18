import fs from 'fs';
import path from 'path';
import process from 'process';
import * as url from 'url';

import { LooseTriggerSet } from '../types/trigger';
import defaultRaidbossOptions from '../ui/raidboss/raidboss_options';
import { TimelineParser } from '../ui/raidboss/timeline_parser';

import { walkDirAsync } from './file_utils';

const __filename = url.fileURLToPath(new URL('.', import.meta.url));
const __dirname = path.basename(__filename);

const root = path.join(__dirname, '../ui/raidboss/data/');
const distRoot = path.join(__dirname, '../dist/TimelineData/');

fs.rmSync(distRoot, { recursive: true, force: true });

const processFile = async (originalFilename: string) => {
  console.error(`Processing file: ${path.relative(path.join(__dirname, '..'), originalFilename)}`);

  const distFilePath = path.join(distRoot, path.relative(root, originalFilename));

  // Copy timeline file if present
  const importPath = (`../ui/raidboss/data/${path.relative(root, originalFilename)}`).replace(
    '\\',
    '/',
  );

  // Dynamic imports don't have a type, so add type assertion.
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  const triggerSet = (await import(importPath)).default as LooseTriggerSet;
  const timelineFilename = triggerSet?.timelineFile;
  if (timelineFilename !== undefined) {
    const timelineFile = path.join(path.dirname(originalFilename), timelineFilename);
    if (fs.existsSync(timelineFile)) {
      const timelineText = fs.readFileSync(timelineFile).toString();
      const timeline = new TimelineParser(timelineText, [], [], [], { ...defaultRaidbossOptions });

      const eventData: unknown[] = [];
      for (let index = 0; index < timeline.events.length; index++) {
        const event = timeline.events[index];
        eventData[index] = {
          id: event?.id,
          time: event?.time,
          name: event?.name,
          text: event?.text,
          activeTime: event?.activeTime,
          lineNumber: event?.lineNumber,
          duration: event?.duration,
          sortKey: event?.sortKey,
          isDur: event?.isDur,
          syncId: event?.sync?.id,
        };
      }

      const syncStartData: unknown[] = [];
      for (let index = 0; index < timeline.syncStarts.length; index++) {
        const syncStart = timeline.syncStarts[index];
        syncStartData[index] = {
          id: syncStart?.id,
          regexType: syncStart?.regexType,
          regex: syncStart?.regex?.source,
          start: syncStart?.start,
          end: syncStart?.end,
          time: syncStart?.time,
          lineNumber: syncStart?.lineNumber,
          eventId: syncStart?.event?.id,
          jump: syncStart?.jump,
          jumpType: syncStart?.jumpType,
        };
      }

      const syncEndData: unknown[] = [];
      for (let index = 0; index < timeline.syncEnds.length; index++) {
        const syncEnd = timeline.syncEnds[index];
        syncEndData[index] = {
          id: syncEnd?.id,
          regexType: syncEnd?.regexType,
          regex: syncEnd?.regex?.source,
          start: syncEnd?.start,
          end: syncEnd?.end,
          time: syncEnd?.time,
          lineNumber: syncEnd?.lineNumber,
          eventId: syncEnd?.event?.id,
          jump: syncEnd?.jump,
          jumpType: syncEnd?.jumpType,
        };
      }

      const forceJumpData: unknown[] = [];
      for (let index = 0; index < timeline.forceJumps.length; index++) {
        const forceJump = timeline.forceJumps[index];
        forceJumpData[index] = {
          id: forceJump?.id,
          regexType: forceJump?.regexType,
          regex: forceJump?.regex?.source,
          start: forceJump?.start,
          end: forceJump?.end,
          time: forceJump?.time,
          lineNumber: forceJump?.lineNumber,
          eventId: forceJump?.event?.id,
          jump: forceJump?.jump,
          jumpType: forceJump?.jumpType,
        };
      }

      const textData: unknown[] = [];
      for (let index = 0; index < timeline.texts.length; index++) {
        const text = timeline.texts[index];
        textData[index] = {
          type: text?.type,
          secondsBefore: text?.secondsBefore,
          text: text?.text,
          time: text?.time,
        };
      }

      const destination = path.join(path.dirname(distFilePath), timelineFilename.replace('.txt', '.json'));

      fs.mkdirSync(path.dirname(distFilePath), { recursive: true });
      fs.writeFileSync(destination, JSON.stringify({
        zoneId: triggerSet?.zoneId,
        events: eventData,
        syncStart: syncStartData,
        syncEnd: syncEndData,
        forceJump: forceJumpData,
        texts: textData,
        ignores: timeline.ignores,
      }));
    }
  }
};

const processAllFiles = async (root: string) => {
  // Process files.
  await walkDirAsync(root, async (filename) => {
    if (filename.endsWith('.js') || filename.endsWith('.ts'))
      await processFile(filename);
  });

  process.exit(0);
};

void processAllFiles(root);