import { useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Filter, X } from "lucide-react";
import SearchResults from "./SearchResults";
import type { Contact } from "@shared/schema";

interface SearchInterfaceProps {
  onContactSelect: (contact: Contact) => void;
}

export default function SearchInterface({ onContactSelect }: SearchInterfaceProps) {
  const [nameSearch, setNameSearch] = useState({
    firstName: "",
    middleName: "",
    lastName: ""
  });
  const [advancedFilters, setAdvancedFilters] = useState({
    zipCode: "",
    ageMin: "",
    ageMax: "",
    party: "",
  });
  const [activeQuickFilters, setActiveQuickFilters] = useState<string[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [draftAdvancedFilters, setDraftAdvancedFilters] = useState(advancedFilters);
  const [draftQuickFilters, setDraftQuickFilters] = useState<string[]>(activeQuickFilters);
  const isMobile = useIsMobile();

  const quickFilters = [
    { id: "supporters", label: "Supporters" },
  ];

  const handleQuickFilterToggle = (filterId: string) => {
    setActiveQuickFilters(prev => 
      prev.includes(filterId) 
        ? prev.filter(id => id !== filterId)
        : [...prev, filterId]
    );
  };

  const clearSearch = () => {
    setNameSearch({
      firstName: "",
      middleName: "",
      lastName: ""
    });
  };

  const clearAllFilters = () => {
    setAdvancedFilters({
      zipCode: "",
      ageMin: "",
      ageMax: "",
      party: "",
    });
    setActiveQuickFilters([]);
  };

  const openMobileFilters = () => {
    // Copy current state to draft when opening
    setDraftAdvancedFilters(advancedFilters);
    setDraftQuickFilters(activeQuickFilters);
    setShowMobileFilters(true);
  };

  const applyMobileFilters = () => {
    // Apply draft changes to actual state
    setAdvancedFilters(draftAdvancedFilters);
    setActiveQuickFilters(draftQuickFilters);
    setShowMobileFilters(false);
  };

  const cancelMobileFilters = () => {
    // Close without applying changes
    setShowMobileFilters(false);
  };

  const clearAllDraftFilters = () => {
    setDraftAdvancedFilters({
      zipCode: "",
      ageMin: "",
      ageMax: "",
      party: "",
    });
    setDraftQuickFilters([]);
  };

  const handleDraftQuickFilterToggle = (filterId: string) => {
    setDraftQuickFilters(prev => 
      prev.includes(filterId) 
        ? prev.filter(id => id !== filterId)
        : [...prev, filterId]
    );
  };

  return (
    <div className="p-6">
      {/* Search Bar and Filters */}
      <Card className="mb-6">
        <CardContent className="p-6 space-y-4">
          {/* Name Search Inputs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">First Name</label>
              <Input
                type="text"
                placeholder="John"
                value={nameSearch.firstName}
                onChange={(e) => setNameSearch(prev => ({ ...prev, firstName: e.target.value }))}
                data-testid="input-first-name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Middle Name</label>
              <Input
                type="text"
                placeholder="Michael"
                value={nameSearch.middleName}
                onChange={(e) => setNameSearch(prev => ({ ...prev, middleName: e.target.value }))}
                data-testid="input-middle-name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Last Name</label>
              <Input
                type="text"
                placeholder="Smith"
                value={nameSearch.lastName}
                onChange={(e) => setNameSearch(prev => ({ ...prev, lastName: e.target.value }))}
                data-testid="input-last-name"
              />
            </div>
          </div>
          
          {/* Clear Search Button */}
          {(nameSearch.firstName || nameSearch.middleName || nameSearch.lastName) && (
            <div className="flex justify-end">
              <Button
                variant="outline"
                size={isMobile ? "default" : "sm"}
                onClick={clearSearch}
                className={isMobile ? "h-11 px-4" : ""}
                data-testid="button-clear-search"
              >
                <X className="w-4 h-4 mr-2" />
                Clear Names
              </Button>
            </div>
          )}
          
          {/* Quick Filters - Mobile: Horizontal scroll, Desktop: Flex wrap */}
          <div className={isMobile ? "overflow-x-auto" : "flex flex-wrap gap-2"}>
            <div className={isMobile ? "flex gap-2 pb-2 min-w-max" : "contents"}>
              {quickFilters.map((filter) => (
                <Button
                  key={filter.id}
                  variant={activeQuickFilters.includes(filter.id) ? "default" : "secondary"}
                  size={isMobile ? "default" : "sm"}
                  onClick={() => handleQuickFilterToggle(filter.id)}
                  className={`${isMobile ? "whitespace-nowrap h-11 px-4" : "text-sm"}`}
                  data-testid={`filter-${filter.id}`}
                >
                  {filter.label}
                </Button>
              ))}
              {/* Mobile Filters Button */}
              {isMobile && (
                <Button
                  variant="outline"
                  size={isMobile ? "default" : "sm"}
                  onClick={openMobileFilters}
                  className={`whitespace-nowrap ${isMobile ? "h-11 px-4" : "text-sm"}`}
                  data-testid="button-mobile-filters"
                >
                  <Filter className="w-4 h-4 mr-1" />
                  Filters
                </Button>
              )}
            </div>
          </div>
          
          {/* Advanced Filters - Desktop Only */}
          {!isMobile && (
            <details className="border-t border-border pt-4">
              <summary 
                className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground"
                onClick={() => setShowAdvanced(!showAdvanced)}
                data-testid="button-advanced-filters"
              >
                Advanced Filters
              </summary>
              {showAdvanced && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">ZIP Code</label>
                    <Input
                      type="text"
                      placeholder="84101"
                      value={advancedFilters.zipCode}
                      onChange={(e) => setAdvancedFilters(prev => ({ ...prev, zipCode: e.target.value }))}
                      data-testid="input-filter-zip"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Party</label>
                    <Select
                      value={advancedFilters.party}
                      onValueChange={(value) => setAdvancedFilters(prev => ({ ...prev, party: value }))}
                    >
                      <SelectTrigger data-testid="select-filter-party">
                        <SelectValue placeholder="All parties" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All parties</SelectItem>
                        <SelectItem value="DEM">DEM - Democrat</SelectItem>
                        <SelectItem value="REP">REP - Republican</SelectItem>
                        <SelectItem value="NPA">NPA - No Party Affiliation</SelectItem>
                        <SelectItem value="IND">IND - Independent</SelectItem>
                        <SelectItem value="LPF">LPF - Libertarian Party of Florida</SelectItem>
                        <SelectItem value="GRE">GRE - Green Party</SelectItem>
                        <SelectItem value="CSV">CSV - Constitution Party</SelectItem>
                        <SelectItem value="NLP">NLP - Natural Law Party</SelectItem>
                        <SelectItem value="CPF">CPF - Communist Party</SelectItem>
                        <SelectItem value="CPP">CPP - Christian Progressive Party</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Age Range</label>
                    <div className="flex space-x-2">
                      <Input
                        type="number"
                        placeholder="18"
                        value={advancedFilters.ageMin}
                        onChange={(e) => setAdvancedFilters(prev => ({ ...prev, ageMin: e.target.value }))}
                        data-testid="input-age-min"
                      />
                      <span className="flex items-center text-muted-foreground">to</span>
                      <Input
                        type="number"
                        placeholder="65"
                        value={advancedFilters.ageMax}
                        onChange={(e) => setAdvancedFilters(prev => ({ ...prev, ageMax: e.target.value }))}
                        data-testid="input-age-max"
                      />
                    </div>
                  </div>
                </div>
              )}
            </details>
          )}
        </CardContent>
      </Card>

      {/* Search Results */}
      <SearchResults 
        nameSearch={nameSearch}
        filters={{ ...advancedFilters, quickFilters: activeQuickFilters }}
        onContactSelect={onContactSelect}
      />

      {/* Mobile Filters Sheet */}
      <Sheet open={showMobileFilters} onOpenChange={setShowMobileFilters}>
        <SheetContent side="bottom" className="h-[90vh] rounded-t-lg">
          <div className="flex flex-col h-full">
            <SheetHeader className="pb-4">
              <div className="flex items-center justify-between">
                <SheetTitle>Filters</SheetTitle>
                <Button
                  variant="ghost"
                  size={isMobile ? "default" : "sm"}
                  onClick={clearAllDraftFilters}
                  className={isMobile ? "h-11 px-4" : ""}
                  data-testid="button-clear-all-filters"
                >
                  <X className="w-4 h-4 mr-1" />
                  Clear All
                </Button>
              </div>
            </SheetHeader>
            
            <div className="flex-1 overflow-y-auto space-y-6">
              {/* Quick Filters */}
              <div>
                <h3 className="text-sm font-medium mb-3">Quick Filters</h3>
                <div className="flex flex-wrap gap-2">
                  {quickFilters.map((filter) => (
                    <Button
                      key={filter.id}
                      variant={draftQuickFilters.includes(filter.id) ? "default" : "secondary"}
                      size="default"
                      onClick={() => handleDraftQuickFilterToggle(filter.id)}
                      className="h-11 px-4 whitespace-nowrap"
                      data-testid={`filter-mobile-${filter.id}`}
                    >
                      {filter.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Advanced Filters */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium">Advanced Filters</h3>
                
                
                <div>
                  <label className="block text-sm font-medium mb-2">ZIP Code</label>
                  <Input
                    type="text"
                    placeholder="84101"
                    value={draftAdvancedFilters.zipCode}
                    onChange={(e) => setDraftAdvancedFilters(prev => ({ ...prev, zipCode: e.target.value }))}
                    data-testid="input-filter-zip-mobile"
                    className="h-12"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Party</label>
                  <Select
                    value={draftAdvancedFilters.party}
                    onValueChange={(value) => setDraftAdvancedFilters(prev => ({ ...prev, party: value }))}
                  >
                    <SelectTrigger className="h-12" data-testid="select-filter-party-mobile">
                      <SelectValue placeholder="All parties" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All parties</SelectItem>
                      <SelectItem value="DEM">DEM - Democrat</SelectItem>
                      <SelectItem value="REP">REP - Republican</SelectItem>
                      <SelectItem value="NPA">NPA - No Party Affiliation</SelectItem>
                      <SelectItem value="IND">IND - Independent</SelectItem>
                      <SelectItem value="LPF">LPF - Libertarian Party of Florida</SelectItem>
                      <SelectItem value="GRE">GRE - Green Party</SelectItem>
                      <SelectItem value="CSV">CSV - Constitution Party</SelectItem>
                      <SelectItem value="NLP">NLP - Natural Law Party</SelectItem>
                      <SelectItem value="CPF">CPF - Communist Party</SelectItem>
                      <SelectItem value="CPP">CPP - Christian Progressive Party</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Age Range</label>
                  <div className="flex space-x-3">
                    <div className="flex-1">
                      <Input
                        type="number"
                        placeholder="18"
                        value={draftAdvancedFilters.ageMin}
                        onChange={(e) => setDraftAdvancedFilters(prev => ({ ...prev, ageMin: e.target.value }))}
                        data-testid="input-age-min-mobile"
                        className="h-12"
                      />
                    </div>
                    <span className="flex items-center text-muted-foreground">to</span>
                    <div className="flex-1">
                      <Input
                        type="number"
                        placeholder="65"
                        value={draftAdvancedFilters.ageMax}
                        onChange={(e) => setDraftAdvancedFilters(prev => ({ ...prev, ageMax: e.target.value }))}
                        data-testid="input-age-max-mobile"
                        className="h-12"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <SheetFooter className="pt-4">
              <div className="flex gap-3 w-full">
                <Button
                  variant="outline"
                  onClick={cancelMobileFilters}
                  className="flex-1 h-12"
                  data-testid="button-cancel-filters"
                >
                  Cancel
                </Button>
                <Button
                  onClick={applyMobileFilters}
                  className="flex-1 h-12"
                  data-testid="button-apply-filters"
                >
                  Apply Filters
                </Button>
              </div>
            </SheetFooter>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
