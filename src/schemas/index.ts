import { FieldConfig } from '@/libs/forms';
import { faker } from '@faker-js/faker';
import { merge } from 'lodash';
import * as Yup from 'yup';

export interface Schema {
  [key: string]: {
    required?: boolean;
    type?: string;
    minLength?: number;
  };
}

// export const extractSchemaLabels = (schema: Yup.ObjectSchema<any>) => {
//   const fields = schema.fields;
//   const result = Object.keys(fields).map((key) => ({
//     name: key,
//     label: fields[key].describe().label || key,
//   }));
//   return result;
// };

type YupSchema<T extends Yup.AnyObject> = Yup.ObjectSchema<T>;

export default class DefaultSchema<T> {
  constructor(public yupSchema: Yup.ObjectSchema<any>) {}

  #generateTestData = <T extends Yup.AnyObject>(schema: YupSchema<T>): T => {
    const shape = schema.fields;
    const data: Partial<T> = {};

    Object.keys(shape).forEach((key) => {
      const field = shape[key];

      if (field instanceof Yup.StringSchema) {
        const minLength = (field.spec as any).min ?? 5;
        const maxLength = (field.spec as any).max ?? 20;
        data[key as keyof T] = faker.lorem.words(
          faker.number.int({ min: minLength, max: maxLength })
        ) as any;
      } else if (field instanceof Yup.NumberSchema) {
        const min = (field.spec as any).min ?? 0;
        const max = (field.spec as any).max ?? 100;
        data[key as keyof T] = faker.number.int({ min, max }) as any;
      } else if (field instanceof Yup.BooleanSchema) {
        data[key as keyof T] = faker.datatype.boolean() as any;
      } else if (field instanceof Yup.DateSchema) {
        const minDate = (field.spec as any).min
          ? new Date((field.spec as any).min)
          : faker.date.past();
        const maxDate = (field.spec as any).max
          ? new Date((field.spec as any).max)
          : faker.date.future();
        data[key as keyof T] = faker.date.between({ from: minDate, to: maxDate }) as any;
      } else if (field instanceof Yup.ArraySchema) {
        const itemType = (field as Yup.ArraySchema<any, any, any, any>).innerType;
        const minItems = (field.spec as any).min ?? 1;
        const maxItems = (field.spec as any).max ?? 5;
        const length = faker.number.int({ min: minItems, max: maxItems });

        if (itemType instanceof Yup.StringSchema) {
          data[key as keyof T] = Array.from({ length }, () => faker.lorem.word()) as any;
        } else if (itemType instanceof Yup.NumberSchema) {
          data[key as keyof T] = Array.from({ length }, () => faker.number.int()) as any;
        }
      } else if (field instanceof Yup.ObjectSchema) {
        data[key as keyof T] = this.#generateTestData(field) as any;
      }
    });

    return data as T;
  };

  getTemplate = () => {
    return this.yupSchema.getDefault();
  };

  getTestData = (count?: number): T | T[] => {
    // If number is 1, return a single object
    if (!count || count === 1) {
      return {
        ...this.#generateTestData(this.yupSchema),
        name: faker.word.verb() + ' ' + faker.word.noun(),
      };
    } else if (count > 1) {
      return Array.from({ length: count }, () => {
        return {
          ...this.#generateTestData(this.yupSchema),
          name: faker.word.verb() + ' ' + faker.word.noun(),
        };
      });
    } else {
      throw new Error('Count must be greater than 0');
    }
  };

  getFieldDefinitions = (fieldConfig?: { [key: string]: Partial<FieldConfig> }) => {
    // Go through all fields and add them to the return schema.
    // Merge with fieldConfig if it exists.
    // If there are meta fields, also add them
    // If there are nested fields, also add them

    const result: { [key: string]: FieldConfig } = {};
    const extractFields = (schema: Yup.ObjectSchema<any>, basePath?: string) => {
      const fields = schema.fields;
      Object.keys(fields).forEach((key) => {
        const newKey = basePath ? `${basePath}.${key}` : key;
        const field = fields[key];
        const description = field.describe();
        const label = 'label' in description ? description.label : key;
        const defaultValue = 'default' in description ? description.default : undefined;
        const meta = 'meta' in description ? description.meta : {};
        const newField: FieldConfig = {
          name: newKey,
          label,
          type: description.type,
          default: defaultValue,
          ...meta,
        };

        if (field.describe().type === 'object') {
          extractFields(field as Yup.ObjectSchema<any>, newField.name);
        }
        result[newKey] = newField;
      });
    };
    extractFields(this.yupSchema);
    const merged = merge({}, result, fieldConfig);
    return merged;
  };
}

export const extractFieldDefinitionFromYupSchema = (
  schema: Yup.ObjectSchema<any>,
  fieldConfig?: { [key: string]: Partial<FieldConfig> }
): { [key: string]: FieldConfig } => {
  // Go through all fields and add them to the return schema.
  // Merge with fieldConfig if it exists.
  // If there are meta fields, also add them
  // If there are nested fields, also add them

  const result: { [key: string]: FieldConfig } = {};
  const extractFields = (schema: Yup.ObjectSchema<any>, basePath?: string) => {
    const fields = schema.fields;
    Object.keys(fields).forEach((key) => {
      const newKey = basePath ? `${basePath}.${key}` : key;
      const field = fields[key];
      const description = field.describe();
      const label = 'label' in description ? description.label : key;
      const defaultValue = 'default' in description ? description.default : undefined;
      const meta = 'meta' in description ? description.meta : {};
      const newField: FieldConfig = {
        name: newKey,
        label,
        type: description.type,
        default: defaultValue,
        ...meta,
      };

      if (field.describe().type === 'object') {
        extractFields(field as Yup.ObjectSchema<any>, newField.name);
      }
      result[newKey] = newField;
    });
  };
  extractFields(schema);
  const merged = merge({}, result, fieldConfig);
  return merged;
};

// const schemas = {
//   recipe: recipeYupSchema,
// };

// export const getYupSchema = (name: keyof typeof schemas) => {
//   const schema = {
//     ...schemas[name],
//   };
//   return schema;
// };
