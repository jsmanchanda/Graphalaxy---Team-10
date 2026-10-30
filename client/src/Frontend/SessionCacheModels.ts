/*
  @fileoverview Defines the models that store the parsed data from backend's JSON strings.
*/

import {
  MISSING_FIELDS_ERROR,
  CLASS_CREATION_ERROR,
  FIELD_RANGE_ERROR,
  TYPE_ERROR,
} from './ErrorMessages';

import type {
  Lesson as LessonType,
  Task as TaskType,
  Reading as ReadingTaskType,
  Question as QuestionTaskType,
} from './types';

/**
 * Checks whether a value is a JSON object (not null and not an array).
 * @param x The value to check.
 * @returns True if x is a non-null, non-array object.
 */
function isObject(x: unknown): x is Record<string, unknown> {
  // empty array or set is also `typeof 'object'`, but we don't want that.
  return typeof x === 'object' && x !== null && !Array.isArray(x);
}

/**
 * Stores user-specific gameplay settings.
 * @param musicVolume The volume level for music.
 * @param sfxVolume The volume level for sound effects.
 */
export class Settings {
  musicVolume: number;
  sfxVolume: number;
  private constructor(musicVolume: number, sfxVolume: number) {
    this.musicVolume = musicVolume;
    this.sfxVolume = sfxVolume;
  }

  private static validateJson(
    json: unknown,
  ): asserts json is {musicVolume: number; sfxVolume: number} {
    if (!isObject(json)) {
      throw new Error(MISSING_FIELDS_ERROR(['musicVolume', 'sfxVolume']));
    }
    const settings = json;
    const missingFields = [];
    if (!('musicVolume' in settings)) {
      missingFields.push('musicVolume');
    }
    if (!('sfxVolume' in settings)) {
      missingFields.push('sfxVolume');
    }
    if (missingFields.length > 0) {
      throw new Error(MISSING_FIELDS_ERROR(missingFields));
    }

    if (
      typeof settings.musicVolume !== 'number' ||
      settings.musicVolume < 0 ||
      settings.musicVolume > 1
    ) {
      throw new Error(FIELD_RANGE_ERROR('musicVolume', 0, 1));
    }
    if (
      typeof settings.sfxVolume !== 'number' ||
      settings.sfxVolume < 0 ||
      settings.sfxVolume > 1
    ) {
      throw new Error(FIELD_RANGE_ERROR('sfxVolume', 0, 1));
    }
  }
  /**
   * Creates a Settings instance from a JSON string.
   * @param jsonString The JSON string representing the settings.
   * @returns A Settings instance.
   * @throws {Error} An error if required fields are missing.
   */
  static createFromJson(jsonString: string): Settings {
    const json = JSON.parse(jsonString);
    // check the fields
    Settings.validateJson(json);
    const settings = new Settings(json.musicVolume, json.sfxVolume);
    return settings;
  }
}

/**
 * Stores a player's information.
 * @param userId The unique numeric identifier for the player.
 * @param hintQuota The number of hints available to the player.
 * @param settings The player's gameplay settings.
 * @param name The player's display name.
 */
export class Player {
  userId: number;
  hintQuota: number;
  settings: Settings;
  name: string;

  /**
   * Validates the JSON object for required fields.
   * @param json The JSON object representing the player.
   * @throws {Error} An error if required fields are missing.
   */
  private static validateJson(json: unknown): asserts json is {
    userId: number;
    name: string;
    hintQuota: number;
  } {
    if (!isObject(json)) {
      throw new Error(MISSING_FIELDS_ERROR(['userId', 'name', 'hintQuota']));
    }
    const player = json;
    const missingFields = [];
    if (!('userId' in player)) {
      missingFields.push('userId');
    }
    if (!('name' in player)) {
      missingFields.push('name');
    }
    if (!('hintQuota' in player)) {
      missingFields.push('hintQuota');
    }
    if (missingFields.length > 0) {
      throw new Error(MISSING_FIELDS_ERROR(missingFields));
    }
    if (typeof player.name !== 'string' || player.name.trim() === '') {
      throw new Error(TYPE_ERROR('name', 'string'));
    }
    if (typeof player.userId !== 'number' || player.userId < 0) {
      throw new Error(FIELD_RANGE_ERROR('userId', 0, Infinity));
    }
    if (typeof player.hintQuota !== 'number' || player.hintQuota < 0) {
      throw new Error(FIELD_RANGE_ERROR('hintQuota', 0, Infinity));
    }
  }

  /**
   * Creates a Player instance from a JSON string.
   * @param jsonString The JSON string representing the player.
   * @returns A Player instance.
   * @throws {Error} An error if required fields are missing or if settings creation fails.
   */
  static createFromJson(jsonString: string): Player {
    const json = JSON.parse(jsonString);
    let settings;
    try {
      if (!isObject(json) || !('settings' in json)) {
        throw new Error(MISSING_FIELDS_ERROR(['settings']));
      }
      settings = Settings.createFromJson(JSON.stringify(json.settings));
    } catch (error) {
      throw new Error(CLASS_CREATION_ERROR('Settings', error));
    }

    Player.validateJson(json);

    const player = new Player(json.userId, json.name, json.hintQuota, settings);
    return player;
  }
  private constructor(
    userId: number,
    name: string,
    hintQuota: number,
    settings: Settings,
  ) {
    this.userId = userId;
    this.name = name;
    this.hintQuota = hintQuota;
    this.settings = settings;
  }
}

/**
 * Planet
 */
export class Planet {
  planetId: number;
  name: string;
  introText: string;
  graphOrder: number;
  lessons: Lesson[];

  /**
   * Creates a new Planet instance.
   * @param planetId Planet unique identifier.
   * @param name Planet name.
   * @param introText Introductory text for the planet.
   * @param graphOrder Planet order in the game map.
   * @param lessons The list of associated lessons.
   */
  private constructor(
    planetId: number,
    name: string,
    introText: string,
    graphOrder: number,
    lessons: Lesson[],
  ) {
    this.planetId = planetId;
    this.name = name;
    this.introText = introText;
    this.graphOrder = graphOrder;
    this.lessons = lessons;
  }

  /**
   * Creates a new Planet instance from a JSON string.
   * @param json The JSON string representing a Planet.
   * @returns A Planet instance.
   */
  static createFromJson(json: string): Planet {
    const obj = JSON.parse(json);
    const lessons = obj.lessons.map((lessonJson: unknown) =>
      Lesson.createFromJson(JSON.stringify(lessonJson)),
    );
    return new Planet(
      obj.planetId,
      obj.name,
      obj.introText,
      obj.graphOrder,
      lessons,
    );
  }
}

/**
 * Generic task in a lesson.
 */
export abstract class Task {
  abstract readonly taskType: 'Reading' | 'Question';
  abstract toType(): TaskType;
}

/**
 * Reading task
 */
export class ReadingTask extends Task {
  readonly taskType = 'Reading' as const;
  text: string;
  /**
   * Creates a new ReadingTask instance with the specified text.
   * @param text The text content of the reading task.
   */
  constructor(text: string) {
    super();
    this.text = text;
  }
  /**
   * Creates a new ReadingTask instance from a JSON string.
   * @param json The JSON string representing a ReadingTask.
   * @returns A ReadingTask instance.
   */
  static createFromJson(json: string): ReadingTask {
    const obj = JSON.parse(json);
    return new ReadingTask(obj.text);
  }
  /**
   * Converts the ReadingTask instance to its corresponding type representation.
   * @returns A ReadingTaskType object.
   */
  toType(): ReadingTaskType {
    return {
      type: this.taskType,
      text: this.text,
    };
  }
}

/**
 * Question task
 */
export class QuestionTask extends Task {
  readonly taskType = 'Question' as const;
  prompt: string;
  options: string[];
  correct: number;
  /**
   * Creates a new QuestionTask instance.
   * @param prompt The question prompt.
   * @param options The list of answer options.
   * @param correct The index of the correct answer.
   */
  private constructor(prompt: string, options: string[], correct: number) {
    super();
    this.prompt = prompt;
    this.options = options;
    this.correct = correct;
  }

  /**
   * Creates a new QuestionTask instance from a JSON string.
   * @param json The JSON string representing a QuestionTask.
   * @returns A QuestionTask instance.
   */
  static createFromJson(json: string): QuestionTask {
    const obj = JSON.parse(json);
    return new QuestionTask(obj.prompt, obj.options, obj.correct);
  }

  /**
   * Converts the QuestionTask instance to its corresponding type representation.
   * @returns A QuestionTaskType object.
   */
  toType(): QuestionTaskType {
    return {
      type: this.taskType,
      prompt: this.prompt,
      options: this.options,
      correct: this.correct,
    };
  }
}

/**
 * Lessons represent the educational content within a planet.
 * Each lesson contains an introductory text, a name, and a list of tasks.
 */
export class Lesson {
  lessonNumber: number;
  introText: string;
  lessonName: string;
  tasks: Task[];
  /**
   * Creates a new Lesson instance with the specified details.
   * @param lessonNumber The number of the lesson.
   * @param introText The introductory text for the lesson.
   * @param lessonName The name of the lesson.
   * @param tasks The list of tasks associated with the lesson.
   */
  private constructor(
    lessonNumber: number,
    introText: string,
    lessonName: string,
    tasks: Task[],
  ) {
    this.lessonNumber = lessonNumber;
    this.introText = introText;
    this.lessonName = lessonName;
    this.tasks = tasks;
  }
  /**
   * Creates a new Lesson instance from a JSON string.
   * @param json The JSON string representing a Lesson.
   * @returns A Lesson instance.
   */
  static createFromJson(json: string): Lesson {
    const obj = JSON.parse(json);
    if (!Array.isArray(obj.tasks)) {
      throw new Error(TYPE_ERROR('tasks', 'array'));
    }
    const tasks = obj.tasks.map((taskJson: unknown) => {
      if (!isObject(taskJson) || !('type' in taskJson)) {
        throw new Error(MISSING_FIELDS_ERROR(['type']));
      }
      switch (taskJson.type) {
        case 'Reading':
          return ReadingTask.createFromJson(JSON.stringify(taskJson));
        case 'Question':
          return QuestionTask.createFromJson(JSON.stringify(taskJson));
        default:
          throw new Error(`Unknown task type: ${taskJson.type}`);
      }
    });
    return new Lesson(obj.lessonNumber, obj.introText, obj.lessonName, tasks);
  }
  /**
   * Converts the Lesson instance to its corresponding type representation.
   * @returns A LessonType object.
   */
  toType(): LessonType {
    return {
      lessonNumber: this.lessonNumber,
      introText: this.introText,
      lessonName: this.lessonName,
      tasks: this.tasks.map(task => task.toType()),
    };
  }
}
