import { matchError, Result, TaggedError } from "better-result";
import type { Feature, FeatureCollection, Geometry } from "geojson";
import { feature } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";
import { isUsState, type StateName } from "./states";

const ATLAS_URL = "/states-10m.json";

export class AtlasFetchError extends TaggedError("AtlasFetchError")<{
  url: string;
  status: number | null;
  message: string;
}> {}

export class AtlasParseError extends TaggedError("AtlasParseError")<{
  message: string;
  cause: unknown;
}> {}

export class AtlasInvalidError extends TaggedError("AtlasInvalidError")<{
  message: string;
}> {}

export type AtlasError = AtlasFetchError | AtlasParseError | AtlasInvalidError;

export type UsStateFeature = Feature<Geometry, { name: StateName }>;

type StateProps = { name: string };

type Atlas = Topology<{
  states: GeometryCollection<StateProps>;
}>;

type TopologyDraft = {
  type?: string;
  objects?: {
    states?: {
      type?: string;
    };
  };
};

function causeMessage(cause: unknown, fallback: string): string {
  if (cause instanceof Error) return cause.message;
  return fallback;
}

function decodeAtlas(value: TopologyDraft | null): Result<Atlas, AtlasInvalidError> {
  if (value === null) {
    return Result.err(new AtlasInvalidError({ message: "Atlas JSON was null" }));
  }
  if (value.type !== "Topology") {
    return Result.err(
      new AtlasInvalidError({ message: `Expected Topology, got ${String(value.type)}` }),
    );
  }
  if (value.objects?.states?.type !== "GeometryCollection") {
    return Result.err(
      new AtlasInvalidError({ message: "Atlas is missing a states GeometryCollection" }),
    );
  }
  // SAFETY: type and objects.states.type match the TopoJSON Topology contract.
  return Result.ok(value as Atlas);
}

function parseAtlasJson(text: string): Result<Atlas, AtlasParseError | AtlasInvalidError> {
  const parsed = Result.try({
    try: () => {
      // SAFETY: JSON.parse is untyped; decodeAtlas checks Topology structure next.
      return JSON.parse(text) as TopologyDraft | null;
    },
    catch: (cause) =>
      new AtlasParseError({
        message: causeMessage(cause, "Invalid JSON"),
        cause,
      }),
  });
  return parsed.andThen(decodeAtlas);
}

function usStatesFromAtlas(
  atlas: Atlas,
): Result<UsStateFeature[], AtlasParseError | AtlasInvalidError> {
  const converted = Result.try({
    try: () => feature(atlas, atlas.objects.states),
    catch: (cause) =>
      new AtlasParseError({
        message: causeMessage(cause, "TopoJSON feature conversion failed"),
        cause,
      }),
  });

  return converted.andThen((collection: FeatureCollection<Geometry, StateProps>) => {
    const states: UsStateFeature[] = [];
    for (const item of collection.features) {
      const name = item.properties.name;
      if (!isUsState(name)) continue;
      states.push({ ...item, properties: { name } });
    }
    if (states.length === 0) {
      return Result.err(new AtlasInvalidError({ message: "Atlas contained no US states" }));
    }
    return Result.ok(states);
  });
}

export function loadUsStates(signal?: AbortSignal): Promise<Result<UsStateFeature[], AtlasError>> {
  return Result.gen(async function* () {
    const response = yield* Result.await(
      Result.tryPromise(
        {
          try: (context) => fetch(ATLAS_URL, { signal: context.signal }),
          catch: (cause) =>
            new AtlasFetchError({
              url: ATLAS_URL,
              status: null,
              message: causeMessage(cause, "Atlas request failed"),
            }),
        },
        { signal },
      ),
    );

    if (!response.ok) {
      return Result.err(
        new AtlasFetchError({
          url: ATLAS_URL,
          status: response.status,
          message: `HTTP ${String(response.status)}`,
        }),
      );
    }

    const text = yield* Result.await(
      Result.tryPromise({
        try: () => response.text(),
        catch: (cause) =>
          new AtlasFetchError({
            url: ATLAS_URL,
            status: response.status,
            message: causeMessage(cause, "Atlas body failed"),
          }),
      }),
    );

    const atlas = yield* parseAtlasJson(text);
    return usStatesFromAtlas(atlas);
  });
}

export function describeAtlasError(error: AtlasError): string {
  return matchError(error, {
    AtlasFetchError: (e) => e.message,
    AtlasParseError: (e) => e.message,
    AtlasInvalidError: (e) => e.message,
  });
}
