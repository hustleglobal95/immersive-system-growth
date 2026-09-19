import test from "node:test";
import assert from "node:assert/strict";
import { isPublishRequestAuthorized, isPublishSessionAuthorized, publishSessionCookie, publishSessionToken } from "../src/platform/studioPublishAuth";

test("publish session token is deterministic without exposing the owner secret", () => {
  const secret = "owner-secret-that-should-not-be-the-cookie";
  const token = publishSessionToken(secret);
  assert.equal(token, publishSessionToken(secret));
  assert.notEqual(token, secret);
  assert.match(token, /^\\d+\\.[a-f0-9]{64}$/);
});

test("publish authorization accepts the legacy bearer secret", () => {
  const secret = "owner-secret";
  const request = new Request("https://forge.test/api/studio/publish", { headers: { authorization: `Bearer ${secret}` } });
  assert.equal(isPublishRequestAuthorized(request, secret), true);
});

test("publish authorization accepts the HTTP-only session token", () => {
  const secret = "owner-secret";
  const cookie = publishSessionCookie(secret, true).split(";")[0];
  const request = new Request("https://forge.test/api/studio/publish", { headers: { cookie } });
  assert.equal(isPublishSessionAuthorized(request, secret), true);
  assert.equal(isPublishRequestAuthorized(request, secret), true);
});


test("publish session authorization rejects an expired signed token", () => {
  const secret = "owner-secret";
  const expired = publishSessionToken(secret, Math.floor(Date.now() / 1000) - 10);
  const request = new Request("https://forge.test/api/studio/publish", { headers: { cookie: `forge_studio_publish_session=${expired}` } });
  assert.equal(isPublishSessionAuthorized(request, secret), false);
});
