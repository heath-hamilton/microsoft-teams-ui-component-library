import React, { useLayoutEffect, useState, useRef } from "react";
import omit from "lodash/omit";
import cloneDeep from "lodash/cloneDeep";

import {
  Box,
  ButtonContent,
  ObjectShorthandCollection,
  Position,
  ProviderConsumer as FluentUIThemeConsumer,
  ShorthandCollection,
  Toolbar as FluentUIToolbar,
  ToolbarItemProps,
  ToolbarItemShorthandKinds,
  Tooltip,
  TreeItemProps,
  tooltipAsLabelBehavior,
} from "@fluentui/react-northstar";

import { SiteVariablesPrepared } from "@fluentui/styles";

import Icon from "../../lib/Icon";
import { TeamsTheme } from "../../themes";

import { actionKey, TAction, TActions } from "../..";

import { ToolbarFilter } from "./ToolbarFilter";
import { ToolbarFind } from "./ToolbarFind";
import { ToolbarTheme } from "./ToolbarTheme";

type TToolbarItems = ShorthandCollection<
  ToolbarItemProps,
  ToolbarItemShorthandKinds
>;

export type TActionGroups = {
  [actionKey: string]: TActions;
};

export type TFilters = ObjectShorthandCollection<TreeItemProps, never>;

export type TToolbarInteraction = {
  event: "click";
  target: "toolbar";
  subject: string | string[] | null;
  action: actionKey;
};

export interface IToolbarProps {
  actionGroups: TActionGroups;
  filters?: TFilters;
  find?: boolean;
  filtersSingleSelect?: boolean;
  onSelectedFiltersChange?: (selectedFilters: string[]) => string[];
  onFindQueryChange?: (findQuery: string) => string;
  onInteraction?: (interaction: TToolbarInteraction) => void;
}

export type TToolbarLayout = "compact" | "verbose";

const slugSeparator = "__";

const toolbarMenuProps = {
  offset: [0, 4] as [number, number],
  position: "below" as Position,
};

const toolbarActionTooltipProps = (() => {
  const props = cloneDeep(toolbarMenuProps);
  props.offset[1] += 10;
  return props;
})();

const toolbarButtonStyles = {
  padding: ".5rem",
  borderWidth: "1px",
  marginTop: 0,
  marginBottom: 0,
  height: "3rem",
  minWidth: 0,
  "&:focus:before": {
    top: "calc(.5rem - 1px)",
    bottom: "calc(.5rem - 1px)",
  },
  "&:focus:after": {
    top: "calc(.5rem - 1px)",
    bottom: "calc(.5rem - 1px)",
  },
};

function flattenedActions(actionGroups: TActionGroups): TActions {
  return Object.keys(actionGroups).reduce(
    (acc_i: TActions, actionGroupSlug: string) => {
      const actionGroup = actionGroups[actionGroupSlug];
      return Object.keys(actionGroup).reduce((acc_j, actionKey) => {
        const action = actionGroup[actionKey];
        acc_j[`${actionGroupSlug}${slugSeparator}${actionKey}`] = action;
        return acc_j;
      }, acc_i);
    },
    {}
  );
}

function needsSeparator(
  actionKey: string,
  index: number,
  actionKeys: string[]
): boolean {
  return index === 0
    ? false
    : actionKeys[index - 1]?.split(slugSeparator)[0] !==
        actionKey.split(slugSeparator)[0];
}

interface IInFlowToolbarItemProps {
  action: TAction;
  layout: TToolbarLayout;
}

const InFlowToolbarItem = ({ action, layout }: IInFlowToolbarItemProps) => {
  const { icon, title } = action;
  const contentIcon = (
    <Box
      styles={{
        width: "1rem",
        display: "inline-flex",
        justifyContent: "center",
        alignItems: "center",
        "@media (min-width: 640px)": {
          marginRight: ".5rem",
        },
      }}
      className="extended-toolbar__near-side__item__icon"
    >
      <Icon icon={icon} />
    </Box>
  );

  switch (layout) {
    case "verbose":
      return (
        <>
          {contentIcon}
          <ButtonContent content={title} />
        </>
      );
    default:
    case "compact":
      return (
        <Tooltip
          {...toolbarActionTooltipProps}
          trigger={contentIcon}
          content={title}
          accessibility={tooltipAsLabelBehavior}
        />
      );
  }
};

export const Toolbar = (props: IToolbarProps) => {
  const { actionGroups, filters, filtersSingleSelect, find } = props;

  const allActions = flattenedActions(actionGroups);

  const [overflowOpen, setOverflowOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [layout, setLayout] = useState<TToolbarLayout>("compact");
  const [findActive, setFindActive] = useState<boolean>(false);

  const layoutQuery = useRef<MediaQueryList | null>(null);

  const onChangeLayout = () => {
    setLayout(
      layoutQuery.current && layoutQuery.current.matches ? "verbose" : "compact"
    );
  };

  useLayoutEffect(() => {
    layoutQuery.current = window.matchMedia("(min-width: 640px)");
    layoutQuery.current.addEventListener("change", onChangeLayout);
    onChangeLayout();
    return () =>
      layoutQuery.current?.removeEventListener("change", onChangeLayout);
  });

  const inFlowToolbarItems: TToolbarItems = Object.keys(allActions).reduce(
    (acc: TToolbarItems, actionKey, index, actionKeys) => {
      const action = allActions[actionKey];

      acc.push({
        key: actionKey,
        children: <InFlowToolbarItem action={action} layout={layout} />,
        title: action.title,
        "aria-label": action.title,
        className: "extended-toolbar__near-side__item",
        styles: {
          ...toolbarButtonStyles,
          flex: "0 0 auto",
          margin: "0 .0625rem",
          display: "inline-flex",
          justifyContent: "center",
          alignItems: "center",
        },
        ...(props.onInteraction && {
          onClick: () =>
            props.onInteraction!({
              event: "click",
              target: "toolbar",
              subject: action.subject || null,
              action: actionKey.split("__").pop()!,
            }),
        }),
      });
      if (needsSeparator(actionKey, index, actionKeys))
        acc.push({
          key: `divider${slugSeparator}${index}`,
          kind: "divider",
        });
      return acc;
    },
    []
  );

  const overflowToolbarItems: TToolbarItems = Object.keys(allActions).reduce(
    (acc: TToolbarItems, actionKey, index, actionKeys) => {
      const action = allActions[actionKey];
      acc.push({
        key: actionKey,
        content: action.title,
        icon: <Icon icon={action.icon} />,
        title: action.title,
        "aria-label": action.title,
        styles: { padding: ".375rem .5rem" },
        ...(props.onInteraction && {
          onClick: () =>
            props.onInteraction!({
              event: "click",
              target: "toolbar",
              action: actionKey.split("__").pop()!,
              subject: action.subject || null,
            }),
        }),
      });
      if (needsSeparator(actionKey, index, actionKeys))
        acc.push({
          key: `divider${slugSeparator}${index}`,
          kind: "divider",
          styles: { margin: ".25rem 0", "&:first-child": { display: "none" } },
        });
      return acc;
    },
    []
  );

  const displayFindOnly = find && layout === "compact" && findActive;

  return (
    <FluentUIThemeConsumer
      render={(globalTheme) => (
        <ToolbarTheme globalTheme={globalTheme}>
          <Box
            className="extended-toolbar"
            variables={({ colorScheme, theme }: SiteVariablesPrepared) => ({
              backgroundColor:
                theme === TeamsTheme.HighContrast
                  ? colorScheme.grey.background
                  : colorScheme.default.background2,
              elevation: colorScheme.elevations[16],
            })}
            styles={{
              display: "flex",
              justifyContent: "space-between",
              padding: "0 1.25rem",
              marginBottom: "1.25rem",
            }}
            {...omit(props, [
              "actionGroups",
              "filters",
              "find",
              "filtersSingleSelect",
              "onSelectedFiltersChange",
              "onFindQueryChange",
            ])}
          >
            {!displayFindOnly && (
              <FluentUIToolbar
                aria-label="Extended toolbar"
                className="extended-toolbar__near-side"
                items={inFlowToolbarItems}
                overflow
                overflowOpen={overflowOpen}
                overflowItem={{
                  title: "More",
                  menu: toolbarMenuProps,
                  styles: toolbarButtonStyles,
                }}
                onOverflowOpenChange={(e, props) => {
                  const open = !!props?.overflowOpen;
                  setOverflowOpen(open);
                  if (open) setFiltersOpen(false);
                }}
                getOverflowItems={(startIndex) =>
                  overflowToolbarItems.slice(startIndex)
                }
                styles={{
                  flex: "1 0 0",
                  overflow: "hidden",
                  maxWidth: "40rem",
                  minWidth: "2rem",
                }}
              />
            )}
            <Box
              className="extended-toolbar__far-side"
              styles={{
                flex: displayFindOnly ? "1 1 100%" : "0 1 auto",
                display: "flex",
                flexFlow: "row nowrap",
                overflow: "hidden",
                paddingLeft: displayFindOnly ? "0" : "2.5rem",
              }}
            >
              {!displayFindOnly && filters && (
                <ToolbarFilter
                  layout={layout}
                  filters={filters}
                  singleSelect={!!filtersSingleSelect}
                  open={filtersOpen}
                  onOpenChange={(_e, props) => {
                    const open = !!props?.open;
                    setFiltersOpen(open);
                    if (open) setOverflowOpen(false);
                  }}
                  onSelectedFiltersChange={props.onSelectedFiltersChange}
                  toolbarMenuProps={toolbarMenuProps}
                  toolbarButtonStyles={toolbarButtonStyles}
                />
              )}
              {find && (
                <ToolbarFind
                  {...{
                    layout,
                    findActive,
                    setFindActive,
                    toolbarButtonStyles,
                    onFindQueryChange: props.onFindQueryChange,
                  }}
                />
              )}
            </Box>
          </Box>
        </ToolbarTheme>
      )}
    />
  );
};
