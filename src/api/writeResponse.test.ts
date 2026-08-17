import { describe, expect, it } from 'vitest';
import { getDisplayError, isWriteSuccess } from './writeResponse';
import type { WriteResponse } from '../types';

function parse(json: string): WriteResponse {
  return JSON.parse(json) as WriteResponse;
}

describe('write response contract', () => {
  it('update inventory success', () => {
    const r = parse('{"id":"p1","message":"Product p1 updated successfully"}');
    expect(isWriteSuccess(r)).toBe(true);
    expect(getDisplayError(r)).toBeNull();
  });

  it('validation error is not success', () => {
    const r = parse('{"errors":"product_price must be numeric"}');
    expect(isWriteSuccess(r)).toBe(false);
    expect(getDisplayError(r)).toBe('product_price must be numeric');
  });

  it('domain exception prefers message', () => {
    const r = parse(
      '{"error":"Requested stock not available","message":"Product X has insufficient stock. Available: 2, Requested: 5"}',
    );
    expect(isWriteSuccess(r)).toBe(false);
    expect(getDisplayError(r)).toBe(
      'Product X has insufficient stock. Available: 2, Requested: 5',
    );
  });

  it('add category success and failure', () => {
    const ok = parse('{"id":"cat-1","message":"Category cat-1 created successfully"}');
    expect(isWriteSuccess(ok)).toBe(true);
    const bad = parse('{"errors":"cat_name is required"}');
    expect(isWriteSuccess(bad)).toBe(false);
    expect(getDisplayError(bad)).toBe('cat_name is required');
  });

  it('empty errors string is failure with null display', () => {
    const r = parse('{"errors":""}');
    expect(isWriteSuccess(r)).toBe(false);
    expect(getDisplayError(r)).toBeNull();
  });

  it('lone error without message returns error text', () => {
    const r = parse('{"error":"Already exists"}');
    expect(isWriteSuccess(r)).toBe(false);
    expect(getDisplayError(r)).toBe('Already exists');
  });
});
